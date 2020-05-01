import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { Container } from 'typedi';
import * as Joi from '@hapi/joi';
import { FlowService } from '../../services';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';
import { BaseFlowActionProcessor } from './BaseFlowActionProcessor';

export class ParallelFlowActionProcessor extends BaseFlowActionProcessor {
    private static actionsValidationSchema = Joi.array().items(FBL_ACTION_SCHEMA.optional()).options({
        abortEarly: true,
    });

    private static validationSchema = Joi.alternatives(
        ParallelFlowActionProcessor.actionsValidationSchema,
        Joi.object()
            .keys({
                actions: ParallelFlowActionProcessor.actionsValidationSchema.required(),
                shareParameters: Joi.boolean(),
            })
            .required()
            .options({
                allowUnknown: false,
                abortEarly: true,
            }),
    );

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return ParallelFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const flowService = Container.get(FlowService);

        let actions;
        let shareParameters = false;
        if (Array.isArray(this.options)) {
            actions = this.options;
        } else {
            actions = this.options.actions;
            shareParameters = this.options.shareParameters;
        }

        const snapshots: ActionSnapshot[] = [];
        const promises = actions.map(
            async (action: any, index: number): Promise<void> => {
                const iterationParams = this.getParameters(shareParameters, { index });

                snapshots[index] = await flowService.executeAction(
                    this.snapshot.source,
                    this.snapshot.wd,
                    action,
                    this.context,
                    iterationParams,
                    this.snapshot,
                );
            },
        );

        await Promise.all(promises);

        // register snapshots in the order of their presence
        snapshots.forEach((childSnapshot) => {
            this.snapshot.registerChildActionSnapshot(childSnapshot);
        });
    }
}

export class ParallelFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.parallel',
        aliases: ['fbl.flow.parallel', 'flow.parallel', 'parallel', 'async', '||'],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true,
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return ParallelFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getProcessor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        return new ParallelFlowActionProcessor(options, context, snapshot, parameters);
    }
}
