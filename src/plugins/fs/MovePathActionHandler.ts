import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import * as Joi from 'joi';
import {FSUtil} from '../../utils/FSUtil';

const version = require('../../../../package.json').version;

export class MovePathActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.move',
        version: version,
        aliases: [
            'fbl.fs.move',
            'fbl.fs.mv',
            'fs.mv',
            'fs.move',
            'move',
            'mv'
        ]
    };

    private static validationSchema = Joi.object({
      from: Joi.string().min(1).required(),
      to: Joi.string().min(1).required()
    }).required();

    getMetadata(): IActionHandlerMetadata {
        return MovePathActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return MovePathActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const from = FSUtil.getAbsolutePath(options.from, snapshot.wd);
        const to = FSUtil.getAbsolutePath(options.to, snapshot.wd);
        await FSUtil.move(from, to);
    }
}
