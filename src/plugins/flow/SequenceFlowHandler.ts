import {ActionHandler} from '../../models';
import {IHandlerMetadata} from '../../models/';
import * as Joi from 'joi';
import {SchemaLike} from 'joi';
import {Container} from 'typedi';
import {FlowService} from '../../services';
import {IContext} from '../../interfaces';

export class SequenceFlowHandler extends ActionHandler {
    private static metadata = <IHandlerMetadata> {
        id: 'com.fireblink.fbl.sequence',
        version: '1.0.0',
        description: 'Sequence flow handler. Allows to run multiple subflows in a chain of actions.',
        aliases: [
            'fbl.sequence',
            'sequence',
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

    getMetadata(): IHandlerMetadata {
        return SequenceFlowHandler.metadata;
    }

    getValidationSchema(): SchemaLike | null {
        return SequenceFlowHandler.validationSchema;
    }

    async execute(options: any, context: IContext): Promise<void> {
        const flowService = Container.get(FlowService);

        for (const action of options) {
            const keys = Object.keys(action);
            const idOrAlias = keys[0];
            await flowService.executeAction(idOrAlias, action[idOrAlias], context);
        }
    }
}
