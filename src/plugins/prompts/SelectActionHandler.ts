import { ActionSnapshot, ActionHandler, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from 'joi';
import { ContextUtil } from '../../utils';
import { BasePromptActionProcessor } from './BasePromptActionProcessor';
import { FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA } from '../../schemas';

export class SelectActionProcessor extends BasePromptActionProcessor {
    private static validationSchema = Joi.object({
        message: Joi.string()
            .required()
            .min(1),

        options: Joi.array()
            .items(Joi.alternatives(
                Joi.string(), 
                Joi.number()),
                Joi.object({
                    title: Joi.string().required().min(1),
                    value: Joi.any().required()
                })
            )
            .min(1)
            .required(),

        default: Joi.alternatives(Joi.string(), Joi.number()),

        assignResponseTo: FBL_ASSIGN_TO_SCHEMA,
        pushResponseTo: FBL_PUSH_TO_SCHEMA,
    })
        .or('assignResponseTo', 'pushResponseTo')
        .required();

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return SelectActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const choices = this.options.options.map((o: string | number | {title: string, value: any}) => {
            if (typeof o === 'string' || typeof o === 'number') {
                return {
                    title: o.toString(),
                    value: o,
                };
            }

            const obj = <{title: string, value: any}> o;

            return {
                title: obj.title,
                value: obj.value,
            };                                
        });

        let initial: number | undefined;
        if (this.options.default !== undefined) {
            const match = choices.find((c: {title: string, value: any}) => c.value === this.options.default);
            initial = choices.indexOf(match);
        }

        const value = await this.prompt({
            type: 'select',
            initial: initial,
            choices: choices,
            message: this.options.message,
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

export class SelectActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.cli.prompts.select',
        aliases: ['fbl.cli.prompts.select', 'cli.prompts.select', 'prompts.select', 'select'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return SelectActionHandler.metadata;
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
        return new SelectActionProcessor(options, context, snapshot, parameters);
    }
}
