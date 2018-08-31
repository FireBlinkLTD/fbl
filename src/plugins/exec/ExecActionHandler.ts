import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import * as Joi from 'joi';
import {BaseExecutableActionHandler} from './BaseExecutableActionHandler';

const version = require('../../../../package.json').version;

export class ExecActionHandler extends BaseExecutableActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.exec',
        version: version,
        aliases: [
            'fbl.exec',
            'exec'
        ]
    };

    private static validationSchema = Joi.object({
            command: Joi.string().min(1).required(),
            args: Joi.array().items(
                Joi.alternatives(
                    Joi.string().min(1),
                    Joi.number()
                )
            ),
            options: Joi.object({
                stdout: Joi.boolean(),
                stderr: Joi.boolean(),
                silent: Joi.boolean()
            }),
            assignTo: Joi.object({
                ctx: Joi.string().min(1),
                secrets: Joi.string().min(1)
            })
        })
        .required()
        .options({ abortEarly: true });

    getValidationSchema(): Joi.SchemaLike | null {
        return ExecActionHandler.validationSchema;
    }

    getMetadata(): IActionHandlerMetadata {
        return ExecActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const result = await this.exec(
            snapshot,
            options.command,
            options.args,
            options.options
        );

        await this.assignTo(
            snapshot,
            context,
            options.assignTo,
            result
        );
    }
}
