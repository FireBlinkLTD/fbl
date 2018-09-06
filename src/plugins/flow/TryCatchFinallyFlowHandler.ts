import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
const version = require('../../../../package.json').version;

export class TryCatchFinallyFlowHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.try',
        version: version,
        aliases: [
            'fbl.flow.try',
            'flow.try',
            'try'
        ],
        skipTemplateProcessing: true
    };

    private static validationSchema = Joi.object({
        action: FBLService.STEP_SCHEMA,
        catch: FBLService.STEP_SCHEMA.optional(),
        finally: FBLService.STEP_SCHEMA.optional(),
    })
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return TryCatchFinallyFlowHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return TryCatchFinallyFlowHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        // run try
        let idOrAlias = FBLService.extractIdOrAlias(options.action);
        let metadata = FBLService.extractMetadata(options.action);
        metadata = flowService.resolveOptionsWithNoHandlerCheck(snapshot.wd, metadata, context, false);

        let childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, options.action[idOrAlias], context);
        snapshot.ignoreChildFailure = true;
        snapshot.registerChildActionSnapshot(childSnapshot);

        // run catch
        if (snapshot.childFailure && options.catch) {
            idOrAlias = FBLService.extractIdOrAlias(options.catch);
            metadata = FBLService.extractMetadata(options.catch);
            metadata = flowService.resolveOptionsWithNoHandlerCheck(snapshot.wd, metadata, context, false);

            childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, options.catch[idOrAlias], context);
            snapshot.ignoreChildFailure = childSnapshot.successful;
            snapshot.registerChildActionSnapshot(childSnapshot);
        }

        // run finally
        if (snapshot.childFailure && options.finally) {
            idOrAlias = FBLService.extractIdOrAlias(options.finally);
            metadata = FBLService.extractMetadata(options.finally);
            metadata = flowService.resolveOptionsWithNoHandlerCheck(snapshot.wd, metadata, context, false);

            childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, options.finally[idOrAlias], context);
            if (snapshot.ignoreChildFailure) {
                snapshot.ignoreChildFailure = childSnapshot.successful;
            }
            snapshot.registerChildActionSnapshot(childSnapshot);
        }
    }
}
