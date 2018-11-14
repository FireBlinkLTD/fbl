import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {FBLService, FlowService} from '../../services';
import {Container} from 'typedi';
import {Validator} from 'jsonschema';
import {AnySchema} from 'joi';
import {FBL_ACTION_SCHEMA} from '../../schemas';

const createJsonSchema = (): AnySchema => {
    return Joi.object({
        id: Joi.string(),
        $schema: Joi.string(),
        $ref: Joi.string(),
        title: Joi.string(),
        description: Joi.string(),
        multipleOf: Joi.number(),
        maximum: Joi.number(),
        exclusiveMaximum: Joi.boolean(),
        minimum: Joi.number(),
        exclusiveMinimum: Joi.boolean(),
        maxLength: Joi.number(),
        minLength: Joi.number(),
        pattern: Joi.string(),
        additionalItems: Joi.alternatives(
            Joi.boolean(),
            Joi.lazy(createJsonSchema)
        ),
        items: Joi.alternatives(
            Joi.lazy(createJsonSchema),
            Joi.array().items(Joi.lazy(createJsonSchema))
        ),
        maxItems: Joi.number(),
        minItems: Joi.number(),
        uniqueItems: Joi.boolean(),
        maxProperties: Joi.number(),
        minProperties: Joi.number(),
        required: Joi.array().items(Joi.string()),
        additionalProperties: Joi.alternatives(
            Joi.boolean(),
            Joi.lazy(createJsonSchema)
        ),
        definitions: Joi.object().pattern(/^/, Joi.lazy(createJsonSchema)),
        properties: Joi.object().pattern(/^/, Joi.lazy(createJsonSchema)),
        patternProperties: Joi.object().pattern(/^/, Joi.lazy(createJsonSchema)),
        dependencies: Joi.object().pattern(/^/, Joi.alternatives(
            Joi.lazy(createJsonSchema),
            Joi.array().items(Joi.string())
        )),
        enum: Joi.array().items(Joi.any()),
        type: Joi.alternatives(
            Joi.string(),
            Joi.array().items(Joi.string())
        ),
        format: Joi.string(),
        allOf: Joi.array().items(Joi.lazy(createJsonSchema)),
        anyOf: Joi.array().items(Joi.lazy(createJsonSchema)),
        oneOf: Joi.array().items(Joi.lazy(createJsonSchema)),
        not: Joi.lazy(createJsonSchema)
    });
};

interface IVirtualDefaults {
    values: any;
    mergeFunction: Function;
}

export class VirtualFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.virtual',
        aliases: [
            'fbl.flow.virtual',
            'flow.virtual',
            'virtual'
        ],
        skipTemplateProcessing: true
    };

    private static validationSchema = Joi.object({
        id: Joi.string().min(1).required(),
        aliases: Joi.array().items(Joi.string().min(1)),
        defaults: Joi.object({
           values: Joi.any().required(),
           mergeFunction: Joi.string().min(1).required()
        }),
        parametersSchema: createJsonSchema(),
        action: FBL_ACTION_SCHEMA
    }).required();

    getMetadata(): IActionHandlerMetadata {
        return VirtualFlowActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return VirtualFlowActionHandler.validationSchema;
    }

    async validate(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await super.validate(options, context, snapshot, parameters);
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        let virtualDefaults: IVirtualDefaults;

        if (options.defaults) {
            const script = [
                'return function(defaults, options) {',
                options.defaults.mergeFunction,
                '}'
            ].join('\n');

            const fn = (new Function(script))();

            virtualDefaults = {
                values: options.defaults.values,
                mergeFunction: fn
            };
        }

        const dynamicFlowHandler = new DynamicFlowHandler(
            options.id,
            options.aliases || [],
            options.parametersSchema,
            options.action,
            virtualDefaults
        );

        context.dynamicActionHandlers.register(dynamicFlowHandler);
    }
}

/**
 * Dynamic flow handler that is being created dynamically by VirtualFlowHandler
 */
class DynamicFlowHandler extends ActionHandler {
    constructor(
        private id: string,
        private aliases: string[],
        private validationSchema: any | null,
        private action: {[key: string]: any},
        private virtualDefaults?: IVirtualDefaults,
    ) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return <IActionHandlerMetadata> {
            id: this.id,
            aliases: this.aliases
        };
    }

    async validate(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        if (this.validationSchema) {
            const mergedOptions = this.virtualDefaults ? this.virtualDefaults.mergeFunction(this.virtualDefaults.values, options) : options;
            const result = new Validator().validate(mergedOptions, this.validationSchema);
            if (!result.valid) {
                throw new Error(result.errors
                    .map(e => {
                        let key = 'value';

                        /* istanbul ignore else */
                        if (e.property !== 'instance') {
                            key = e.property.substring('instance.'.length);
                        }

                        return `${key} ${e.message}`;
                    })
                    .join('\n')
                );
            }
        }
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const mergedOptions = this.virtualDefaults ? this.virtualDefaults.mergeFunction(this.virtualDefaults.values, options) : options;
        const flowService = Container.get(FlowService);

        const idOrAlias = FBLService.extractIdOrAlias(this.action);
        let metadata = FBLService.extractMetadata(this.action);
        metadata = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false, parameters);

        parameters = JSON.parse(JSON.stringify(parameters));
        parameters.parameters = mergedOptions;

        const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, this.action[idOrAlias], context, parameters);
        snapshot.registerChildActionSnapshot(childSnapshot);
    }
}
