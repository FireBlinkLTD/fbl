import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import * as Joi from 'joi';
import {FSUtil} from '../../utils';

const version = require('../../../../package.json').version;

export class CopyPathActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.copy',
        version: version,
        aliases: [
            'fbl.fs.copy',
            'fbl.fs.cp',
            'fs.cp',
            'fs.copy',
            'copy',
            'cp'
        ]
    };

    private static validationSchema = Joi.object({
        from: Joi.string().min(1).required(),
        to: Joi.string().min(1).required()
    }).required();

    getMetadata(): IActionHandlerMetadata {
        return CopyPathActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return CopyPathActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const from = FSUtil.getAbsolutePath(options.from, snapshot.wd);
        const to = FSUtil.getAbsolutePath(options.to, snapshot.wd);
        await FSUtil.copy(from, to);
    }
}
