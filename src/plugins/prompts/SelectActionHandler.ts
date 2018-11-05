import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {ContextUtil} from '../../utils';
import {BasePromptActionHandler} from './BasePromptActionHandler';

const version = require('../../../../package.json').version;

export class SelectActionHandler extends BasePromptActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.cli.prompts.select',
        version: version,
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
