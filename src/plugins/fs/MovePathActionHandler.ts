import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from '@hapi/joi';
import { FSUtil } from '../../utils';
import { sep } from 'path';

export class MovePathActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object({
        from: Joi.string().min(1).required(),
        to: Joi.string().min(1).required(),
    }).required();

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return MovePathActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        let from = FSUtil.getAbsolutePath(this.options.from, this.snapshot.wd);
        if (this.options.from.endsWith(sep)) {
            from += sep;
        }

        let to = FSUtil.getAbsolutePath(this.options.to, this.snapshot.wd);
        if (this.options.to.endsWith(sep)) {
            to += sep;
        }

        await FSUtil.move(from, to);
    }
}

export class MovePathActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.fs.move',
        aliases: ['fbl.fs.move', 'fbl.fs.mv', 'fs.mv', 'fs.move', 'move', 'mv'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return MovePathActionHandler.metadata;
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
        return new MovePathActionProcessor(options, context, snapshot, parameters);
    }
}
