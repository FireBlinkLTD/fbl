import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import * as Joi from 'joi';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {BaseExecutableActionHandler} from './BaseExecutableActionHandler';

const tmp = require('tmp-promise');

const version = require('../../../../package.json').version;

export class ShellActionHandler extends BaseExecutableActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.shell',
        version: version,
        aliases: [
            'fbl.shell',
            'shell'
        ]
    };

    private static validationSchema = Joi.object({
        executable: Joi.string().min(1).required(),
        script: Joi.string().min(1).required(),
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
        return ShellActionHandler.validationSchema;
    }

    getMetadata(): IActionHandlerMetadata {
        return ShellActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const file = await tmp.file();
        await promisify(writeFile)(file.path, options.script, 'utf8');

        const result: any = await this.exec(
            snapshot,
            options.executable,
            [
                file.path
            ],
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