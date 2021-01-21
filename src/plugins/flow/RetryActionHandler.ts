import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import * as Joi from 'joi';
import { FlowService } from '../../services';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FBL_ACTION_SCHEMA, FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA } from '../../schemas';
import { ContextUtil } from '../../utils';
import { UNEXPECTED } from '../../errors';

export class RetryActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object({
        action: FBL_ACTION_SCHEMA,
        attempts: Joi.number().required().min(1),
        errorCode: Joi.object({
            assignTo: FBL_ASSIGN_TO_SCHEMA,
            pushTo: FBL_PUSH_TO_SCHEMA,
        }).options({ abortEarly: true, allowUnknown: false }),
    })
        .required()
        .options({
            abortEarly: true,
            allowUnknown: false,
        });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return RetryActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        let retriesLeft = this.options.attempts;

        let childSnapshot;
        while (retriesLeft > 0) {
            // run try
            childSnapshot = await FlowService.instance.executeAction(
                this.snapshot.source,
                this.snapshot.wd,
                this.options.action,
                this.context,
                this.parameters,
                this.snapshot,
            );

            this.snapshot.registerChildActionSnapshot(childSnapshot);

            if (childSnapshot.successful) {
                break;
            }

            retriesLeft--;
        }

        if (childSnapshot.successful) {
            this.snapshot.ignoreChildFailure = true;
        }

        if (!childSnapshot.successful && this.options.errorCode) {
            const code = childSnapshot.errorCode || UNEXPECTED;
            ContextUtil.assignTo(this.context, this.parameters, this.snapshot, this.options.errorCode.assignTo, code);
            ContextUtil.pushTo(this.context, this.parameters, this.snapshot, this.options.errorCode.pushTo, code);
        }
    }
}

export class RetryActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.retry',
        aliases: ['fbl.flow.retry', 'flow.retry', 'retry'],
        skipTemplateProcessing: true,
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return RetryActionHandler.metadata;
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
        return new RetryActionProcessor(options, context, snapshot, parameters);
    }
}
