import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { Container } from 'typedi';
import * as Joi from 'joi';
import { FlowService } from '../../services';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';

export class TryCatchFinallyFlowActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object({
        action: FBL_ACTION_SCHEMA,
        catch: FBL_ACTION_SCHEMA.optional(),
        finally: FBL_ACTION_SCHEMA.optional(),
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return TryCatchFinallyFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const flowService = Container.get(FlowService);

        // run try
        let childSnapshot = await flowService.executeAction(
            this.snapshot.wd,
            this.options.action,
            this.context,
            this.parameters,
            this.snapshot,
        );
        this.snapshot.ignoreChildFailure = true;
        this.snapshot.registerChildActionSnapshot(childSnapshot);

        // run catch
        if (this.snapshot.childFailure && this.options.catch) {
            childSnapshot = await flowService.executeAction(
                this.snapshot.wd,
                this.options.catch,
                this.context,
                this.parameters,
                this.snapshot,
            );
            this.snapshot.ignoreChildFailure = childSnapshot.successful;
            this.snapshot.registerChildActionSnapshot(childSnapshot);
        }

        // run finally
        if (this.options.finally) {
            childSnapshot = await flowService.executeAction(
                this.snapshot.wd,
                this.options.finally,
                this.context,
                this.parameters,
                this.snapshot,
            );

            if (this.snapshot.ignoreChildFailure) {
                this.snapshot.ignoreChildFailure = childSnapshot.successful;
            }

            this.snapshot.registerChildActionSnapshot(childSnapshot);
        }
    }
}

export class TryCatchFinallyFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.try',
        aliases: ['fbl.flow.try', 'flow.try', 'try'],
        skipTemplateProcessing: true,
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return TryCatchFinallyFlowActionHandler.metadata;
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
        return new TryCatchFinallyFlowActionProcessor(options, context, snapshot, parameters);
    }
}
