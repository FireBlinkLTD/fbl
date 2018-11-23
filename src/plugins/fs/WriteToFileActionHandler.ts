import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {writeFile} from 'fs';
import {promisify} from 'util';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {ContextUtil, FSUtil} from '../../utils';
import {dirname} from 'path';
import {Container} from 'typedi';
import {FlowService, TempPathsRegistry} from '../../services';
import {FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA} from '../../schemas';

export class WriteToFileActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.file.write',
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

        assignPathTo: FBL_ASSIGN_TO_SCHEMA,
        pushPathTo: FBL_PUSH_TO_SCHEMA,

        contentFromFile: Joi.string().min(1),
        content: Joi.alternatives(Joi.number(), Joi.string())
    })
        .or('path', 'assignPathTo')
        .xor('content', 'contentFromFile')
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return WriteToFileActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return WriteToFileActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        let file;
        if (options.path) {
            file = FSUtil.getAbsolutePath(options.path, snapshot.wd);
        } else {
            file = await Container.get(TempPathsRegistry).createTempFile(true);
        }

        // create folders structure if needed
        await FSUtil.mkdirp(dirname(file));

        let content = options.content;
        if (options.contentFromFile) {
            const flowService = Container.get(FlowService);

            content = await FSUtil.readTextFile(FSUtil.getAbsolutePath(options.contentFromFile, snapshot.wd));

            // resolve with global template delimiter first
            content = await flowService.resolveTemplate(
                context.ejsTemplateDelimiters.global,
                snapshot.wd,
                content,
                context,
                parameters
            );

            // resolve local template delimiter
            content = await flowService.resolveTemplate(
                context.ejsTemplateDelimiters.local,
                snapshot.wd,
                content,
                context,
                parameters
            );
        }

        snapshot.log(`Writing content to a file: ${file}`);
        await promisify(writeFile)(file, content, 'utf8');

        /* istanbul ignore else */
        if (options.assignPathTo) {
            await ContextUtil.assignTo(
                context,
                parameters,
                snapshot,
                options.assignPathTo,
                file,
                options.assignPathTo.override
            );
        }

        /* istanbul ignore else */
        if (options.pushPathTo) {
            await ContextUtil.pushTo(
                context,
                parameters,
                snapshot,
                options.pushPathTo,
                file,
                options.pushPathTo.children,
                options.pushPathTo.override
            );
        }
    }
}
