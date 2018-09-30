import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import * as Joi from 'joi';

const version = require('../../../../package.json').version;
const prompts = require('prompts');

export class MultiSelectActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.cli.multiselect',
        version: version,
        aliases: [
            'fbl.cli.multiselect',
            'cli.multiselect',
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

        assignResponseTo: Joi.object({
            ctx: Joi.string().min(1),
            secrets: Joi.string().min(1)
        }).required(),
    }).required();

    getMetadata(): IActionHandlerMetadata {
        return MultiSelectActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return MultiSelectActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const value = (await prompts({
            type: 'multiselect',
            name: 'value',
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
