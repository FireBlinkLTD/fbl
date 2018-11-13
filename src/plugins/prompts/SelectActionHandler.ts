import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {ContextUtil} from '../../utils';
import {BasePromptActionHandler} from './BasePromptActionHandler';
import {FBL_ASSIGN_TO_SCHEMA} from '../../schemas';

export class SelectActionHandler extends BasePromptActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.cli.prompts.select',
        aliases: [
            'fbl.cli.prompts.select',
            'cli.prompts.select',
            'prompts.select',
            'select',
        ]
    };

    private static validationSchema = Joi.object({
        message: Joi.string().required().min(1),

        options: Joi.array().items(Joi.alternatives(
            Joi.string(),
            Joi.number()
        )).min(1).required(),

        default: Joi.alternatives(
            Joi.string(),
            Joi.number()
        ),

        assignResponseTo: FBL_ASSIGN_TO_SCHEMA.required(),
    }).required();

    getMetadata(): IActionHandlerMetadata {
        return SelectActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return SelectActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const value = await this.prompt({
            type: 'select',
            initial: options.default ? options.options.indexOf(options.default) : undefined,
            choices: options.options.map((o: string | number) => {
                return {
                    title: o.toString,
                    value: o
                };
            }),
            message: options.message,
        });

        await ContextUtil.assignTo(context, parameters, snapshot, options.assignResponseTo, value);
    }
}
