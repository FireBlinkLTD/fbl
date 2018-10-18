import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import * as Joi from 'joi';
import {ContextUtil} from '../../utils';
import {BasePromptActionHandler} from './BasePromptActionHandler';

const version = require('../../../../package.json').version;

export class ConfirmActionHandler extends BasePromptActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.cli.prompts.confirm',
        version: version,
        aliases: [
            'fbl.cli.prompts.confirm',
            'cli.prompts.confirm',
            'prompts.confirm',
            'confirm'
        ]
    };

    private static validationSchema = Joi.object({
        message: Joi.string().required().min(1),

        default: Joi.boolean(),

        assignResponseTo: Joi.object({
            ctx: Joi.string()
                .regex(/^\$\.[^.]+(\.[^.]+)*$/)
                .min(1),
            secrets: Joi.string()
                .regex(/^\$\.[^.]+(\.[^.]+)*$/)
                .min(1)
        }).required(),
    }).required();

    getMetadata(): IActionHandlerMetadata {
        return ConfirmActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return ConfirmActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const value = await this.prompt({
            type: 'confirm',
            initial: options.default,
            message: options.message,
        });

        /* istanbul ignore else */
        if (options.assignResponseTo.ctx) {
            await ContextUtil.assignToField(context.ctx, options.assignResponseTo.ctx, value);
        }

        /* istanbul ignore else */
        if (options.assignResponseTo.secrets) {
            await ContextUtil.assignToField(context.secrets, options.assignResponseTo.secrets, value);
        }

        snapshot.setContext(context);
    }
}
