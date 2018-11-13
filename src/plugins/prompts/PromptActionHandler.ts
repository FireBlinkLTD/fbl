import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {Validator} from 'jsonschema';
import * as Joi from 'joi';
import {ContextUtil} from '../../utils';
import {BasePromptActionHandler} from './BasePromptActionHandler';
import {FBL_ASSIGN_TO_SCHEMA} from '../../schemas';

export class PromptActionHandler extends BasePromptActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.cli.prompts.prompt',
        aliases: [
            'fbl.cli.prompts.prompt',
            'cli.prompts.prompt',
            'prompts.prompt',
            'prompt'
        ]
    };

    private static validationSchema = Joi.object({
            message: Joi.string().required().min(1),
            password: Joi.boolean(),

            default: Joi.alternatives(
                Joi.string(),
                Joi.number()
            ),

            schema: Joi.object({
                type: Joi.string().valid([
                    'string', 'integer', 'number'
                ]).required(),

                // when type is "string"
                pattern: Joi.string().min(1),
                minLength: Joi.number().min(0),
                maxLength: Joi.number().min(1),

                // when type is "number" or "integer":
                multipleOf: Joi.number(),
                minimum: Joi.number(),
                maximum: Joi.number(),
                exclusiveMinimum: Joi.boolean(),
                exclusiveMaximum: Joi.boolean()
            }),

            assignResponseTo: FBL_ASSIGN_TO_SCHEMA.required(),
        }).required();

    getMetadata(): IActionHandlerMetadata {
        return PromptActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return PromptActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        let type = 'text';
        let float: boolean | undefined;
        let min: number | undefined;
        let max: number | undefined;

        /* istanbul ignore else */
        if (options.schema && options.schema.type !== 'string') {
            type = 'number';

            /* istanbul ignore else */
            if (options.schema.type === 'number') {
                float = true;
            }

            /* istanbul ignore else */
            if (options.schema.minimum) {
                min = options.schema.minimum;
            }

            /* istanbul ignore else */
            if (options.schema.maximum) {
                max = options.schema.maximum;
            }
        }

        const validator = new Validator();

        let value = await this.prompt({
            type: type,
            float: float,
            min: min,
            max: max,
            initial: options.default,
            style: options.password ? 'password' : 'default',
            message: options.message,
            validate: (v: any): boolean | string => {
                if (options.schema) {
                    if (options.schema.type !== 'string' && !isNaN(v)) {
                        v = Number(v);
                    }

                    const result = validator.validate(v, options.schema);
                    if (!result.valid) {
                        return result.errors
                            .map((e: Error) => `value ${e.message}`)
                            .join('\n');
                    }
                }

                return true;
            }
        });

        if (options.schema && options.schema.type !== 'string' && !isNaN(value)) {
            value = Number(value);
        }

        await ContextUtil.assignTo(context, parameters, snapshot, options.assignResponseTo, value);
    }
}
