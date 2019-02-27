import { ActionHandler, ActionSnapshot } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters, IIteration } from '../../interfaces';
import * as Joi from 'joi';
import { FlowService } from '../../services';
import { Container } from 'typedi';
import { FBL_ACTION_SCHEMA } from '../../schemas';
import { IMetadata } from '../../interfaces/IMetadata';

export class ForEachFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.foreach',
        aliases: ['fbl.flow.foreach', 'flow.foreach', 'foreach', 'each'],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true,
    };

    private static validationSchema = Joi.object({
        shareParameters: Joi.boolean(),
        of: Joi.alternatives(Joi.object(), Joi.array()).required(),
        action: FBL_ACTION_SCHEMA,
        async: Joi.boolean(),
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return ForEachFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return ForEachFlowActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async validate(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        const flowService = Container.get(FlowService);
        options.of = await flowService.resolveOptionsWithNoHandlerCheck(
            context.ejsTemplateDelimiters.local,
            options.of,
            context,
            snapshot,
            parameters,
            false,
        );

        if (options.async) {
            options.async = await flowService.resolveOptionsWithNoHandlerCheck(
                context.ejsTemplateDelimiters.local,
                options.async,
                context,
                snapshot,
                parameters,
                false,
            );
        }

        await super.validate(options, context, snapshot, parameters);
    }

    /**
     * Get parameters for single iteration
     * @param shareParameters
     * @param metadata
     * @param parameters
     * @param iteration
     */
    private static getParameters(
        shareParameters: boolean,
        metadata: IMetadata,
        parameters: IDelegatedParameters,
        iteration: IIteration,
    ): any {
        const result = <IDelegatedParameters>{
            iteration: iteration,
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

        const isArray = Array.isArray(options.of);
        const iterable = isArray ? options.of : Object.keys(options.of);

        for (let i = 0; i < iterable.length; i++) {
            const iteration = <IIteration>{
                index: i,
            };

            if (isArray) {
                iteration.value = iterable[i];
            } else {
                iteration.value = options.of[iterable[i]];
                iteration.key = iterable[i];
            }

            const actionParameters = ForEachFlowActionHandler.getParameters(
                options.shareParameters,
                snapshot.metadata,
                parameters,
                iteration,
            );
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
                    })(actionParameters),
                );
            } else {
                snapshots[i] = await flowService.executeAction(
                    snapshot.wd,
                    options.action,
                    context,
                    actionParameters,
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
