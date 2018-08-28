import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {writeFile} from 'fs';
import {promisify} from 'util';
import {Container} from 'typedi';
import {FlowService} from '../../services';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {FSUtil} from '../../utils/FSUtil';

const version = require('../../../../package.json').version;

export class WriteToFile extends ActionHandler {
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
            .min(1)
            .required(),
        content: Joi.alternatives(Joi.number(), Joi.string())
            .required()
    })
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return WriteToFile.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return WriteToFile.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);
        const file = FSUtil.getAbsolutePath(options.path, snapshot.wd);
        snapshot.log(`Writing content to a file: ${file}`);
        await promisify(writeFile)(file, options.content, 'utf8');
    }
}
