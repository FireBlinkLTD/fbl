import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {ContextUtil} from '../../utils';
import {BasePromptActionHandler} from './BasePromptActionHandler';
import {FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA} from '../../schemas';

export class MultiSelectActionHandler extends BasePromptActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.cli.prompts.multiselect',
        aliases: [
            'fbl.cli.prompts.multiselect',
            'cli.prompts.multiselect',
            'prompts.multiselect',
            'multiselect'
        ]
    };

    private static validationSchema = Joi.object({
        message: Joi.string().required().min(1),

        options: Joi.array().items(Joi.alternatives(
            Joi.string(),
            Joi.number()
        )).min(1).required(),

        default: Joi.array().items(Joi.alternatives(
            Joi.string(),
            Joi.number()
        )),

        max: Joi.number(),

        hint: Joi.string(),

        assignResponseTo: FBL_ASSIGN_TO_SCHEMA,
        pushResponseTo: FBL_PUSH_TO_SCHEMA,
    })
        .or('assignResponseTo', 'pushResponseTo')
        .required();

    getMetadata(): IActionHandlerMetadata {
        return MultiSelectActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return MultiSelectActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const value = await this.prompt({
            type: 'multiselect',
            choices: options.options.map((o: string | number) => {
                return {
                    title: o.toString,
                    value: o,
                    selected: options.default && options.default.indexOf(o) >= 0
                };
            }),
            message: options.message,
            max: options.max,
            hint: options.hint || '- Space to select. Return to submit'
        });

        /* istanbul ignore else */
        if (options.assignResponseTo) {
            await ContextUtil.assignTo(
                context,
                parameters,
                snapshot,
                options.assignResponseTo,
                value,
                options.assignResponseTo.override
            );
        }

        /* istanbul ignore else */
        if (options.pushResponseTo) {
            await ContextUtil.pushTo(
                context,
                parameters,
                snapshot,
                options.pushResponseTo,
                value,
                options.pushResponseTo.children,
                options.pushResponseTo.override
            );
        }
    }
}
