import { ActionHandler, ActionSnapshot } from '../../models';
import { Container } from 'typedi';
import * as Joi from 'joi';
import { FlowService } from '../../services';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';

export class TryCatchFinallyFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.try',
        aliases: ['fbl.flow.try', 'flow.try', 'try'],
        skipTemplateProcessing: true,
    };

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
    getMetadata(): IActionHandlerMetadata {
        return TryCatchFinallyFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return TryCatchFinallyFlowActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        const flowService = Container.get(FlowService);

        // run try
        let childSnapshot = await flowService.executeAction(snapshot.wd, options.action, context, parameters, snapshot);
        snapshot.ignoreChildFailure = true;
        snapshot.registerChildActionSnapshot(childSnapshot);

        // run catch
        if (snapshot.childFailure && options.catch) {
            childSnapshot = await flowService.executeAction(snapshot.wd, options.catch, context, parameters, snapshot);
            snapshot.ignoreChildFailure = childSnapshot.successful;
            snapshot.registerChildActionSnapshot(childSnapshot);
        }

        // run finally
        if (options.finally) {
            childSnapshot = await flowService.executeAction(
                snapshot.wd,
                options.finally,
                context,
                parameters,
                snapshot,
            );
            if (snapshot.ignoreChildFailure) {
                snapshot.ignoreChildFailure = childSnapshot.successful;
            }
            snapshot.registerChildActionSnapshot(childSnapshot);
        }
    }
}
