import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {FSUtil} from '../../utils';
import {sep} from 'path';

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

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        let from = FSUtil.getAbsolutePath(options.from, snapshot.wd);
        if (options.from.endsWith(sep)) {
            from += sep;
        }

        let to = FSUtil.getAbsolutePath(options.to, snapshot.wd);
        if (options.to.endsWith(sep)) {
            to += sep;
        }

        await FSUtil.move(from, to);
    }
}
