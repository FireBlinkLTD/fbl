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
        let idOrAlias = Object.keys(options.action)[0];

        let childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, options.action[idOrAlias], context);
        snapshot.ignoreChildFailure = true;
        snapshot.registerChildActionSnapshot(childSnapshot);

        // run catch
        if (snapshot.childFailure && options.catch) {
            idOrAlias = Object.keys(options.catch)[0];

            childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, options.catch[idOrAlias], context);
            snapshot.ignoreChildFailure = childSnapshot.successful;
            snapshot.registerChildActionSnapshot(childSnapshot);
        }

        // run finally
        if (snapshot.childFailure && options.catch) {
            idOrAlias = Object.keys(options.finally)[0];

            childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, options.finally[idOrAlias], context);
            if (snapshot.ignoreChildFailure) {
                snapshot.ignoreChildFailure = childSnapshot.successful;
            }
            snapshot.registerChildActionSnapshot(childSnapshot);
        }
    }
}
