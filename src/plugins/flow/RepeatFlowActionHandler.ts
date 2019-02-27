import * as Joi from 'joi';
import { ActionHandler, ActionSnapshot } from '../../models';
import { FlowService } from '../../services';
import { Container } from 'typedi';
import { IActionHandlerMetadata, IContext, IDelegatedParameters, IIteration } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';

export class RepeatFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.repeat',
        aliases: ['fbl.flow.repeat', 'flow.repeat', 'repeat'],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true,
    };

    private static validationSchema = Joi.object({
        shareParameters: Joi.boolean(),
        times: Joi.number()
            .min(0)
            .required(),
        action: FBL_ACTION_SCHEMA,
        async: Joi.boolean(),
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return RepeatFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return RepeatFlowActionHandler.validationSchema;
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
        const result = <IDelegatedParameters>{
            iteration: { index },
        };

        if (parameters && parameters.parameters !== undefined) {
            result.parameters = shareParameters
                ? parameters.parameters
                : JSON.parse(JSON.stringify(parameters.parameters));
        }

        return result;
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

        const promises: Promise<void>[] = [];
        const snapshots: ActionSnapshot[] = [];

        for (let i = 0; i < options.times; i++) {
            const iterationParams = RepeatFlowActionHandler.getParameters(options.shareParameters, parameters, i);

            if (options.async) {
                promises.push(
                    (async (p): Promise<void> => {
                        snapshots[p.iteration.index] = await flowService.executeAction(
                            snapshot.wd,
                            options.action,
                            context,
                            p,
                            snapshot,
                        );
                    })(iterationParams),
                );
            } else {
                snapshots[i] = await flowService.executeAction(
                    snapshot.wd,
                    options.action,
                    context,
                    iterationParams,
                    snapshot,
                );
            }
        }

        await Promise.all(promises);

        // register snapshots in the order of their presence
        snapshots.forEach(childSnapshot => {
            snapshot.registerChildActionSnapshot(childSnapshot);
        });
    }
}
