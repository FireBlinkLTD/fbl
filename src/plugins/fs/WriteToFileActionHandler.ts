import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {writeFile} from 'fs';
import {promisify} from 'util';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {FSUtil} from '../../utils/FSUtil';
import {dirname} from 'path';

const version = require('../../../../package.json').version;
const tmp = require('tmp-promise');

export class WriteToFileActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.file.write',
        version: version,
        aliases: [
            'fbl.fs.file.write',
            'fs.file.write',
            'file.write',
            '->'
        ]
    };

    private static validationSchema = Joi.object({
        path: Joi.string()
            .min(1),

        assignPathTo: Joi.object({
            ctx: Joi.string().min(1),
            secrets: Joi.string().min(1)
        }),

        content: Joi.alternatives(Joi.number(), Joi.string())
            .required()
    })
        .or('path', 'assignPathTo')
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return WriteToFileActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return WriteToFileActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        let file;
        if (options.path) {
            file = FSUtil.getAbsolutePath(options.path, snapshot.wd);
        } else {
            const tmpFile = await tmp.file({
                keep: true
            });
            file = tmpFile.path;
        }

        // create folders structure if needed
        await FSUtil.mkdirp(dirname(file));

        snapshot.log(`Writing content to a file: ${file}`);
        await promisify(writeFile)(file, options.content, 'utf8');

        /* istanbul ignore else */
        if (options.assignPathTo) {
            /* istanbul ignore else */
            if (options.assignPathTo.ctx) {
                context.ctx[options.assignPathTo.ctx] = file;
            }

            /* istanbul ignore else */
            if (options.assignPathTo.secrets) {
                context.secrets[options.assignPathTo.secrets] = file;
            }

            snapshot.setContext(context);
        }
    }
}