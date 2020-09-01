import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from 'joi';
import { FSUtil } from '../../utils';

export class RemovePathActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.string().min(1).required();

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return RemovePathActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const path = FSUtil.getAbsolutePath(this.options, this.snapshot.wd);
        await FSUtil.remove(path);
    }
}

export class RemovePathActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.fs.remove',
        aliases: ['fbl.fs.remove', 'fbl.fs.rm', 'fs.rm', 'fs.remove', 'rm -rf', 'remove', 'rm'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return RemovePathActionHandler.metadata;
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
        return new RemovePathActionProcessor(options, context, snapshot, parameters);
    }
}
