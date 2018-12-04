import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {FSUtil} from '../../utils';

export class MakeDirActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.dir.create',
        aliases: [
            'fbl.fs.dir.create',
            'fs.dir.create',
            'dir.create',
            'mkdir -p',
            'mkdir'
        ]
    };

    private static validationSchema = Joi.string()
        .min(1)
        .required();

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return MakeDirActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return MakeDirActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const path = FSUtil.getAbsolutePath(options, snapshot.wd);
        await FSUtil.mkdirp(path);
    }
}
