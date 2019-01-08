import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {FSUtil} from '../../utils';
import {sep} from 'path';

export class CopyPathActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.copy',
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
    })
        .required()
        .options({
            abortEarly: true
        });

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return CopyPathActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return CopyPathActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        let from = FSUtil.getAbsolutePath(options.from, snapshot.wd);
        if (options.from.endsWith(sep)) {
            from += sep;
        }

        let to = FSUtil.getAbsolutePath(options.to, snapshot.wd);
        if (options.to.endsWith(sep)) {
            to += sep;
        }

        await FSUtil.copy(from, to);
    }
}
