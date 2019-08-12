import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import * as Joi from 'joi';
import { writeFile } from 'fs';
import { promisify } from 'util';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { ContextUtil, FSUtil } from '../../utils';
import { dirname } from 'path';
import { Container } from 'typedi';
import { FlowService, TempPathsRegistry } from '../../services';
import { FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA } from '../../schemas';

export class WriteToFileActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object({
        path: Joi.string().min(1),

        assignPathTo: FBL_ASSIGN_TO_SCHEMA,
        pushPathTo: FBL_PUSH_TO_SCHEMA,

        contentFromFile: Joi.string().min(1),
        content: Joi.alternatives(Joi.number(), Joi.string()),
    })
        .or('path', 'assignPathTo')
        .xor('content', 'contentFromFile')
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return WriteToFileActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        let file;
        if (this.options.path) {
            file = FSUtil.getAbsolutePath(this.options.path, this.snapshot.wd);
        } else {
            file = await Container.get(TempPathsRegistry).createTempFile(true);
        }

        // create folders structure if needed
        await FSUtil.mkdirp(dirname(file));

        let content = this.options.content;
        if (this.options.contentFromFile) {
            const flowService = Container.get(FlowService);

            const absolutePath = FSUtil.getAbsolutePath(this.options.contentFromFile, this.snapshot.wd);
            content = await FSUtil.readTextFile(absolutePath);

            // resolve with global template delimiter first
            content = await flowService.resolveTemplate(
                this.context.ejsTemplateDelimiters.global,
                content,
                this.context,
                this.snapshot,
                this.parameters,
                {},
                dirname(absolutePath),
            );

            // resolve local template delimiter
            content = await flowService.resolveTemplate(
                this.context.ejsTemplateDelimiters.local,
                content,
                this.context,
                this.snapshot,
                this.parameters,
            );
        }

        this.snapshot.log(`Writing content to a file: ${file}`);
        await promisify(writeFile)(file, content, 'utf8');

        /* istanbul ignore else */
        if (this.options.assignPathTo) {
            ContextUtil.assignTo(this.context, this.parameters, this.snapshot, this.options.assignPathTo, file);
        }

        /* istanbul ignore else */
        if (this.options.pushPathTo) {
            ContextUtil.pushTo(this.context, this.parameters, this.snapshot, this.options.pushPathTo, file);
        }
    }
}

export class WriteToFileActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.fs.file.write',
        aliases: ['fbl.fs.file.write', 'fs.file.write', 'file.write', '->'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return WriteToFileActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getProcessor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        return new WriteToFileActionProcessor(options, context, snapshot, parameters);
    }
}
