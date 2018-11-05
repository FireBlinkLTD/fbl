import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {Container} from 'typedi';
import {FBLService, FlowService} from '../../services';
import {IActionHandlerMetadata, IContext, IDelegatedParameters, IIteration} from '../../interfaces';

const version = require('../../../../package.json').version;

export class SequenceFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.sequence',
        version: version,
        aliases: [
            'fbl.flow.sequence',
            'flow.sequence',
            'sequence',
            'sync',
            '--',
        ],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true
    };

    private static validationSchema = Joi.array()
        .items(FBLService.STEP_SCHEMA)
        .min(1)
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return SequenceFlowActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return SequenceFlowActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        let index = 0;
        for (const action of options) {
            const idOrAlias = FBLService.extractIdOrAlias(action);
            let metadata = FBLService.extractMetadata(action);

            const actionParameters = JSON.parse(JSON.stringify(parameters));
            actionParameters.iteration = <IIteration> {
                index
            };

            metadata = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false, actionParameters);

            const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, action[idOrAlias], context, actionParameters);
            snapshot.registerChildActionSnapshot(childSnapshot);

            index++;

            // stop processing after first failure
            if (!childSnapshot.successful) {
                return;
            }
        }
    }
}
