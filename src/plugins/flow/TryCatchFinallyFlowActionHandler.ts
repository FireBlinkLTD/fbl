import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {FBL_ACTION_SCHEMA} from '../../schemas';

export class TryCatchFinallyFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.try',
        aliases: [
            'fbl.flow.try',
            'flow.try',
            'try'
        ],
        skipTemplateProcessing: true
    };

    private static validationSchema = Joi.object({
        action: FBL_ACTION_SCHEMA,
        catch: FBL_ACTION_SCHEMA.optional(),
        finally: FBL_ACTION_SCHEMA.optional(),
    })
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return TryCatchFinallyFlowActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return TryCatchFinallyFlowActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        // run try
        let idOrAlias = FBLService.extractIdOrAlias(options.action);
        let metadata = FBLService.extractMetadata(options.action);
        metadata = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false, parameters);

        let childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, options.action[idOrAlias], context, parameters);
        snapshot.ignoreChildFailure = true;
        snapshot.registerChildActionSnapshot(childSnapshot);

        // run catch
        if (snapshot.childFailure && options.catch) {
            idOrAlias = FBLService.extractIdOrAlias(options.catch);
            metadata = FBLService.extractMetadata(options.catch);
            metadata = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false, parameters);

            childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, options.catch[idOrAlias], context, parameters);
            snapshot.ignoreChildFailure = childSnapshot.successful;
            snapshot.registerChildActionSnapshot(childSnapshot);
        }

        // run finally
        if (snapshot.childFailure && options.finally) {
            idOrAlias = FBLService.extractIdOrAlias(options.finally);
            metadata = FBLService.extractMetadata(options.finally);
            metadata = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false, parameters);

            childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, options.finally[idOrAlias], context, parameters);
            if (snapshot.ignoreChildFailure) {
                snapshot.ignoreChildFailure = childSnapshot.successful;
            }
            snapshot.registerChildActionSnapshot(childSnapshot);
        }
    }
}
