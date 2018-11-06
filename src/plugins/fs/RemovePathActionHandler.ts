import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {FSUtil} from '../../utils';

export class RemovePathActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.remove',
        aliases: [
            'fbl.fs.remove',
            'fbl.fs.rm',
            'fs.rm',
            'fs.remove',
            'rm -rf',
            'remove',
            'rm'
        ]
    };

    private static validationSchema = Joi.string()
        .min(1)
        .required();

    getMetadata(): IActionHandlerMetadata {
        return RemovePathActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return RemovePathActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const path = FSUtil.getAbsolutePath(options, snapshot.wd);
        await FSUtil.remove(path);
    }
}
