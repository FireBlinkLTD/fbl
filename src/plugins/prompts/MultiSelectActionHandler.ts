import { ActionSnapshot, ActionHandler, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from 'joi';
import { ContextUtil } from '../../utils';
import { BasePromptActionProcessor } from './BasePromptActionProcessor';
import { FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA } from '../../schemas';

export class MultiSelectActionProcessor extends BasePromptActionProcessor {
    private static validationSchema = Joi.object({
        message: Joi.string()
            .required()
            .min(1),

        options: Joi.array()
            .items(
                Joi.alternatives(Joi.string(), Joi.number()),
                Joi.object({
                    title: Joi.string()
                        .required()
                        .min(1),
                    value: Joi.any().required(),
                }),
            )
            .min(1)
            .required(),

        default: Joi.array().items(Joi.alternatives(Joi.string(), Joi.number())),

        max: Joi.number(),

        hint: Joi.string(),

        assignResponseTo: FBL_ASSIGN_TO_SCHEMA,
        pushResponseTo: FBL_PUSH_TO_SCHEMA,
    })
        .or('assignResponseTo', 'pushResponseTo')
        .required();

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return MultiSelectActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const choices = this.options.options.map((o: string | number | { title: string; value: any }) => {
            let result: {
                title: string;
                value: any;
                selected: boolean;
            };

            if (typeof o === 'string' || typeof o === 'number') {
                result = {
                    title: o.toString(),
                    value: o,
                    selected: false,
                };
            } else {
                const obj = <{ title: string; value: any }>o;
                result = {
                    title: obj.title,
                    value: obj.value,
                    selected: false,
                };
            }

            let selected = false;
            if (this.options.default) {
                selected = this.options.default.indexOf(result.value) >= 0;
            }

            result.selected = selected;

            return result;
        });

        const value = await this.prompt({
            type: 'multiselect',
            choices: choices,
            message: this.options.message,
            max: this.options.max,
            hint: this.options.hint || '- Space to select. Return to submit',
        });

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

export class MultiSelectActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.cli.prompts.multiselect',
        aliases: ['fbl.cli.prompts.multiselect', 'cli.prompts.multiselect', 'prompts.multiselect', 'multiselect'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return MultiSelectActionHandler.metadata;
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
        return new MultiSelectActionProcessor(options, context, snapshot, parameters);
    }
}
