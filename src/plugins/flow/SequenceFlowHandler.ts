import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {Container} from 'typedi';
import {FlowService} from '../../services';
import {IActionHandlerMetadata, IContext} from '../../interfaces';

export class SequenceFlowHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.sequence',
        version: '1.0.0',
        description: 'Sequence flow handler. Allows to run multiple subflows in a chain of actions.',
        aliases: [
            'fbl.sequence',
            'sequence',
            'sync',
            '--',
        ],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true
    };

    private static validationSchema = Joi.array()
        .items(
            Joi.object()
                .min(1)
                .max(1)
                .required()
        )
        .min(1)
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return SequenceFlowHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return SequenceFlowHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        let index = 0;
        for (const action of options) {
            const keys = Object.keys(action);
            const idOrAlias = keys[0];
            const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, action[idOrAlias], context, index);
            snapshot.registerChildActionSnapshot(childSnapshot);

            index++;

            // stop processing after first failure
            if (!childSnapshot.successful) {
                return;
            }
        }
    }
}
