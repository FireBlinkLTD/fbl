import { ActionHandler, ActionSnapshot } from '../../models';
import * as Joi from 'joi';
import { Container } from 'typedi';
import { FlowService } from '../../services';
import { IActionHandlerMetadata, IContext, IDelegatedParameters, IIteration } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';

export class SequenceFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.sequence',
        aliases: ['fbl.flow.sequence', 'flow.sequence', 'sequence', 'sync', '--'],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true,
    };

    private static actionsValidationSchema = Joi.array()
        .items(FBL_ACTION_SCHEMA.optional())
        .required()
        .options({ abortEarly: true });

    private static validationSchema = Joi.alternatives(
        SequenceFlowActionHandler.actionsValidationSchema,
        Joi.object()
            .keys({
                actions: SequenceFlowActionHandler.actionsValidationSchema,
                shareParameters: Joi.boolean(),
            })
            .requiredKeys('actions')
            .required()
            .options({
                allowUnknown: false,
                abortEarly: true,
            }),
    );

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return SequenceFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return SequenceFlowActionHandler.validationSchema;
    }

    /**
     * Get parameters for single iteration
     * @param shareParameters
     * @param metadata
     * @param parameters
     * @param index
     */
    private static getParameters(
        shareParameters: boolean,
        parameters: IDelegatedParameters,
        index: number,
    ): IDelegatedParameters {
        const actionParameters: IDelegatedParameters = shareParameters
            ? parameters
            : JSON.parse(JSON.stringify(parameters));
        actionParameters.iteration = { index };

        return actionParameters;
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

        let actions;
        let shareParameters = false;
        if (Array.isArray(options)) {
            actions = options;
        } else {
            actions = options.actions;
            shareParameters = options.shareParameters;
        }

        let index = 0;
        for (const action of actions) {
            const actionParameters = SequenceFlowActionHandler.getParameters(shareParameters, parameters, index);

            const childSnapshot = await flowService.executeAction(
                snapshot.wd,
                action,
                context,
                actionParameters,
                snapshot,
            );
            snapshot.registerChildActionSnapshot(childSnapshot);

            index++;

            // stop processing after first failure
            if (!childSnapshot.successful) {
                return;
            }
        }
    }
}
