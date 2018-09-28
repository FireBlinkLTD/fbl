import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import * as Joi from 'joi';

const version = require('../../../../package.json').version;
const prompts = require('prompts');

export class ConfirmActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.cli.confirm',
        version: version,
        aliases: [
            'fbl.cli.confirm',
            'cli.confirm',
            'confirm'
        ]
    };

    private static validationSchema = Joi.object({
        message: Joi.string().required().min(1),

        default: Joi.boolean(),

        assignResponseTo: Joi.object({
            ctx: Joi.string().min(1),
            secrets: Joi.string().min(1)
        }).required(),
    }).required();

    getMetadata(): IActionHandlerMetadata {
        return ConfirmActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return ConfirmActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const value = (await prompts({
            type: 'confirm',
            name: 'value',
            initial: options.default,
            message: options.message,
        })).value;

        /* istanbul ignore else */
        if (options.assignResponseTo.ctx) {
            context.ctx[options.assignResponseTo.ctx] = value;
        }

        /* istanbul ignore else */
        if (options.assignResponseTo.secrets) {
            context.secrets[options.assignResponseTo.secrets] = value;
        }

        snapshot.setContext(context);
    }
}
