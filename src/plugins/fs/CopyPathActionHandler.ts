import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from 'joi';
import { FSUtil } from '../../utils';
import { sep } from 'path';

export class CopyPathActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object({
        from: Joi.string()
            .min(1)
            .required(),
        to: Joi.string()
            .min(1)
            .required(),
    })
        .required()
        .options({
            abortEarly: true,
        });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return CopyPathActionProcessor.validationSchema;
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

        await FSUtil.copy(from, to);
    }
}

export class CopyPathActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.fs.copy',
        aliases: ['fbl.fs.copy', 'fbl.fs.cp', 'fs.cp', 'fs.copy', 'copy', 'cp'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return CopyPathActionHandler.metadata;
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
        return new CopyPathActionProcessor(options, context, snapshot, parameters);
    }
}
