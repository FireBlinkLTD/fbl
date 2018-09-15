import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {FBLService, FlowService} from '../../services';
import {Container} from 'typedi';
import {Validator} from 'jsonschema';
import {AnySchema} from 'joi';

const version = require('../../../../package.json').version;

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

export class VirtualFlowHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.virtual',
        version: version,
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
        parametersSchema: createJsonSchema(),
        action: FBLService.STEP_SCHEMA
    }).required();

    getMetadata(): IActionHandlerMetadata {
        return VirtualFlowHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return VirtualFlowHandler.validationSchema;
    }

    async validate(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        await super.validate(options, context, snapshot);
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const dynamicFlowHandler = new DynamicFlowHandler(
            options.id,
            options.aliases || [],
            options.parametersSchema,
            options.action
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
        private action: {[key: string]: any}
    ) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return <IActionHandlerMetadata> {
            id: this.id,
            version: version,
            aliases: this.aliases
        };
    }

    async validate(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        if (this.validationSchema) {
            const result = new Validator().validate(options, this.validationSchema);
            if (!result.valid) {
                throw new Error(result.errors.map(e => `"${e.property.substring('instance.'.length)}" ${e.message}`).join('\n'));
            }
        }
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        const idOrAlias = FBLService.extractIdOrAlias(this.action);
        let metadata = FBLService.extractMetadata(this.action);
        metadata = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false);

        await flowService.executeAction(snapshot.wd, idOrAlias, metadata, this.action[idOrAlias], context, null, {
            parameters: options
        });
    }
}
