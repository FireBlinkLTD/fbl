import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from 'joi';
import { FSUtil } from '../../utils';

export class MakeDirActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.string()
        .min(1)
        .required();

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return MakeDirActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const path = FSUtil.getAbsolutePath(this.options, this.snapshot.wd);
        await FSUtil.mkdirp(path);
    }
}

export class MakeDirActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.fs.dir.create',
        aliases: ['fbl.fs.dir.create', 'fs.dir.create', 'dir.create', 'mkdir -p', 'mkdir'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return MakeDirActionHandler.metadata;
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
        return new MakeDirActionProcessor(options, context, snapshot, parameters);
    }
}
