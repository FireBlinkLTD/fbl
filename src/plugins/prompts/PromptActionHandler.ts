import { ActionSnapshot, ActionHandler, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { Validator } from 'jsonschema';
import * as Joi from 'joi';
import { ContextUtil } from '../../utils';
import { BasePromptActionProcessor } from './BasePromptActionProcessor';
import { FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA } from '../../schemas';

export class PromptActionProcessor extends BasePromptActionProcessor {
    private static validationSchema = Joi.object({
        message: Joi.string()
            .required()
            .min(1),
        password: Joi.boolean(),

        default: Joi.alternatives(Joi.string(), Joi.number()),

        schema: Joi.object({
            type: Joi.string()
                .valid(['string', 'integer', 'number'])
                .required(),

            // when type is "string"
            pattern: Joi.string().min(1),
            minLength: Joi.number().min(0),
            maxLength: Joi.number().min(1),

            // when type is "number" or "integer":
            multipleOf: Joi.number(),
            minimum: Joi.number(),
            maximum: Joi.number(),
            exclusiveMinimum: Joi.boolean(),
            exclusiveMaximum: Joi.boolean(),
        }),

        assignResponseTo: FBL_ASSIGN_TO_SCHEMA,
        pushResponseTo: FBL_PUSH_TO_SCHEMA,
    })
        .or('assignResponseTo', 'pushResponseTo')
        .required();

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return PromptActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        let type = 'text';
        let float: boolean | undefined;
        let min: number | undefined;
        let max: number | undefined;

        /* istanbul ignore else */
        if (this.options.schema && this.options.schema.type !== 'string') {
            type = 'number';

            /* istanbul ignore else */
            if (this.options.schema.type === 'number') {
                float = true;
            }

            /* istanbul ignore else */
            if (this.options.schema.minimum) {
                min = this.options.schema.minimum;
            }

            /* istanbul ignore else */
            if (this.options.schema.maximum) {
                max = this.options.schema.maximum;
            }
        }

        const validator = new Validator();

        let value = await this.prompt({
            type: type,
            float: float,
            min: min,
            max: max,
            initial: this.options.default,
            style: this.options.password ? 'password' : 'default',
            message: this.options.message,
            validate: (v: any): boolean | string => {
                if (this.options.schema) {
                    if (this.options.schema.type !== 'string' && !isNaN(v)) {
                        v = Number(v);
                    }

                    const result = validator.validate(v, this.options.schema);
                    if (!result.valid) {
                        return result.errors.map((e: Error) => `value ${e.message}`).join('\n');
                    }
                }

                return true;
            },
        });

        if (this.options.schema && this.options.schema.type !== 'string' && !isNaN(value)) {
            value = Number(value);
        }

        /* istanbul ignore else */
        if (this.options.assignResponseTo) {
            ContextUtil.assignTo(this.context, this.parameters, this.snapshot, this.options.assignResponseTo, value);
        }

        /* istanbul ignore else */
        if (this.options.pushResponseTo) {
            ContextUtil.pushTo(this.context, this.parameters, this.snapshot, this.options.pushResponseTo, value);
        }
    }
}

export class PromptActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.cli.prompts.prompt',
        aliases: ['fbl.cli.prompts.prompt', 'cli.prompts.prompt', 'prompts.prompt', 'prompt'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return PromptActionHandler.metadata;
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
        return new PromptActionProcessor(options, context, snapshot, parameters);
    }
}
