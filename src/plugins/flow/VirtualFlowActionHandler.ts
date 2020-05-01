import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import * as Joi from '@hapi/joi';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FlowService } from '../../services';
import { Container } from 'typedi';
import { Validator } from 'jsonschema';
import { AnySchema } from '@hapi/joi';
import { FBL_ACTION_SCHEMA } from '../../schemas';
import { collide, ICollideModifiers } from 'object-collider';
import { ActionError, INVALID_CONFIGURATION } from '../../errors';

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
        additionalItems: Joi.alternatives(Joi.boolean(), createJsonSchema),
        items: Joi.alternatives(createJsonSchema, Joi.array().items(createJsonSchema)),
        maxItems: Joi.number(),
        minItems: Joi.number(),
        uniqueItems: Joi.boolean(),
        maxProperties: Joi.number(),
        minProperties: Joi.number(),
        required: Joi.array().items(Joi.string()),
        additionalProperties: Joi.alternatives(Joi.boolean(), createJsonSchema),
        definitions: Joi.object().pattern(/^/, createJsonSchema),
        properties: Joi.object().pattern(/^/, createJsonSchema),
        patternProperties: Joi.object().pattern(/^/, createJsonSchema),
        dependencies: Joi.object().pattern(/^/, Joi.alternatives(createJsonSchema, Joi.array().items(Joi.string()))),
        enum: Joi.array().items(Joi.any()),
        type: Joi.alternatives(Joi.string(), Joi.array().items(Joi.string())),
        format: Joi.string(),
        allOf: Joi.array().items(createJsonSchema),
        anyOf: Joi.array().items(createJsonSchema),
        oneOf: Joi.array().items(createJsonSchema),
        not: createJsonSchema,
    });
};

interface IVirtualDefaults {
    values: any;
    mergeFunction?: Function;
    modifiers?: ICollideModifiers;
}

export class VirtualFlowActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object({
        id: Joi.string().min(1).required(),
        aliases: Joi.array().items(Joi.string().min(1)),
        defaults: Joi.object({
            values: Joi.any().required(),
            mergeFunction: Joi.string().min(1),
            modifiers: Joi.object().pattern(/\$(\.[^\.]+)*/, Joi.string()),
        })
            .without('mergeFunction', 'modifiers')
            .without('modifiers', 'mergeFunction'),
        parametersSchema: createJsonSchema(),
        dynamicWorkDir: Joi.boolean(),
        action: FBL_ACTION_SCHEMA,
    }).required();

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return VirtualFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async validate(): Promise<void> {
        const flowService = Container.get(FlowService);

        let unmaskedParametersSchema;
        if (this.options.hasOwnProperty('parametersSchema')) {
            const masked = await flowService.resolveOptionsWithNoHandlerCheck(
                this.context.ejsTemplateDelimiters.local,
                this.options.parametersSchema,
                this.context,
                this.snapshot,
                this.parameters,
                true,
            );

            unmaskedParametersSchema = await flowService.resolveOptionsWithNoHandlerCheck(
                this.context.ejsTemplateDelimiters.local,
                this.options.parametersSchema,
                this.context,
                this.snapshot,
                this.parameters,
                false,
            );

            this.options.parametersSchema = masked;
        }

        let unmaskedDefaults;
        if (this.options.hasOwnProperty('defaults')) {
            const masked = await flowService.resolveOptionsWithNoHandlerCheck(
                this.context.ejsTemplateDelimiters.local,
                this.options.defaults,
                this.context,
                this.snapshot,
                this.parameters,
                true,
            );

            unmaskedDefaults = await flowService.resolveOptionsWithNoHandlerCheck(
                this.context.ejsTemplateDelimiters.local,
                this.options.defaults,
                this.context,
                this.snapshot,
                this.parameters,
                false,
            );

            this.options.defaults = masked;
        }
        this.snapshot.setOptions(this.options);

        this.options.parametersSchema = unmaskedParametersSchema;
        this.options.defaults = unmaskedDefaults;

        await super.validate();
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        let virtualDefaults: IVirtualDefaults;

        if (this.options.defaults) {
            virtualDefaults = {
                values: this.options.defaults.values,
            };

            if (this.options.defaults.mergeFunction) {
                const script = [
                    'return function(defaults, parameters) {',
                    this.options.defaults.mergeFunction,
                    '}',
                ].join('\n');

                virtualDefaults.mergeFunction = new Function(script)();
            }

            if (this.options.defaults.modifiers) {
                virtualDefaults.modifiers = {};
                for (const path of Object.keys(this.options.defaults.modifiers)) {
                    const script = [
                        'return function(defaults, parameters) {',
                        this.options.defaults.modifiers[path],
                        '}',
                    ].join('\n');

                    virtualDefaults.modifiers[path] = new Function(script)();
                }
            }
        }

        const dynamicFlowHandler = new DynamicFlowActionHandler(
            this.options.dynamicWorkDir ? null : this.snapshot.wd,
            this.snapshot.wd,
            this.options.id,
            this.options.aliases || [],
            this.options.parametersSchema,
            this.options.action,
            virtualDefaults,
        );

        this.context.dynamicActionHandlers.register(dynamicFlowHandler, require('./index'), this.snapshot);
    }
}

export class VirtualFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.virtual',
        aliases: ['fbl.flow.virtual', 'flow.virtual', 'virtual'],
        skipTemplateProcessing: true,
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return VirtualFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getProcessor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        return new VirtualFlowActionProcessor(options, context, snapshot, parameters);
    }
}

class DynamicFlowActionProcessor extends ActionProcessor {
    constructor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
        private wd: string | null,
        private pwd: string,
        private validationSchema: any | null,
        private action: { [key: string]: any },
        private virtualDefaults?: IVirtualDefaults,
    ) {
        super(options, context, snapshot, parameters);
    }

    /**
     * @inheritdoc
     */
    async validate(): Promise<void> {
        if (this.validationSchema) {
            const mergedOptions = this.getMergedOptions(this.options);

            const result = new Validator().validate(mergedOptions, this.validationSchema);
            if (!result.valid) {
                throw new ActionError(
                    result.errors
                        .map((e) => {
                            let key = 'value';

                            /* istanbul ignore else */
                            if (e.property !== 'instance') {
                                key = e.property.substring('instance.'.length);
                            }

                            return `${key} ${e.message}`;
                        })
                        .join('\n'),
                    INVALID_CONFIGURATION,
                );
            }
        }
    }

    /**
     * Merge passed options with default values
     * @param options
     */
    private getMergedOptions(options: any): any {
        let mergedOptions = options;

        if (this.virtualDefaults) {
            if (this.virtualDefaults.mergeFunction) {
                const clonedDefaults = JSON.parse(JSON.stringify(this.virtualDefaults.values));
                mergedOptions = this.virtualDefaults.mergeFunction(clonedDefaults, options);
            } else {
                mergedOptions = collide(this.virtualDefaults.values, options, this.virtualDefaults.modifiers);
            }
        }

        return mergedOptions;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const flowService = Container.get(FlowService);

        if (this.wd) {
            this.snapshot.wd = this.wd;
        }

        this.parameters.parameters = this.getMergedOptions(this.options);
        this.parameters.parameters.wd = this.snapshot.wd;
        this.parameters.parameters.pwd = this.pwd;

        const childSnapshot = await flowService.executeAction(
            this.snapshot.source,
            this.snapshot.wd,
            this.action,
            this.context,
            this.parameters,
            this.snapshot,
        );
        this.snapshot.registerChildActionSnapshot(childSnapshot);
    }
}

/**
 * Dynamic flow handler that is being created dynamically by VirtualFlowHandler
 */
class DynamicFlowActionHandler extends ActionHandler {
    constructor(
        private wd: string | null,
        private pwd: string,
        private id: string,
        private aliases: string[],
        private validationSchema: any | null,
        private action: { [key: string]: any },
        private virtualDefaults?: IVirtualDefaults,
    ) {
        super();
    }

    /**
     * @inheritdoc
     */
    getWorkingDirectory(): string | null {
        return this.wd;
    }

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return <IActionHandlerMetadata>{
            id: this.id,
            aliases: this.aliases,
        };
    }

    /**
     * @inheritdoc
     */
    getProcessor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        return new DynamicFlowActionProcessor(
            options,
            context,
            snapshot,
            parameters,

            this.wd,
            this.pwd,
            this.validationSchema,
            this.action,
            this.virtualDefaults,
        );
    }
}
