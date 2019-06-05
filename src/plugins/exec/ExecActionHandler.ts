import { ActionSnapshot, ActionHandler, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from 'joi';
import { BaseExecutableActionProcessor } from './BaseExecutableActionProcessor';
import { FBL_ASSIGN_TO_SCHEMA } from '../../schemas';

export class ExecActionProcessor extends BaseExecutableActionProcessor {
    private static validationSchema = Joi.object({
        command: Joi.string()
            .min(1)
            .required(),
        args: Joi.array().items(Joi.alternatives(Joi.string().min(1), Joi.number())),
        options: Joi.object({
            stdout: Joi.boolean(),
            stderr: Joi.boolean(),
            verbose: Joi.boolean(),
        }),
        assignResultTo: FBL_ASSIGN_TO_SCHEMA,
        pushResultTo: FBL_ASSIGN_TO_SCHEMA,
        wd: Joi.string().min(1),
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return ExecActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const result = await this.exec(this.options.command, this.options.args, this.options.wd, this.options.options);

        await this.storeResult(this.options.assignResultTo, this.options.pushResultTo, result);
    }
}

export class ExecActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.exec',
        aliases: ['fbl.exec', 'exec'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return ExecActionHandler.metadata;
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
        return new ExecActionProcessor(options, context, snapshot, parameters);
    }
}
