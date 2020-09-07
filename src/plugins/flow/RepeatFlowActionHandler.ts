import * as Joi from 'joi';
import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { FlowService } from '../../services';
import { Container } from 'typedi';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';
import { BaseFlowActionProcessor } from './BaseFlowActionProcessor';

export class RepeatFlowActionProcessor extends BaseFlowActionProcessor {
    private static validationSchema = Joi.object({
        shareParameters: Joi.boolean(),
        times: Joi.number().min(0).required(),
        action: FBL_ACTION_SCHEMA,
        async: Joi.boolean(),
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return RepeatFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const flowService = Container.get(FlowService);

        const promises: Promise<void>[] = [];
        const snapshots: ActionSnapshot[] = [];

        for (let i = 0; i < this.options.times; i++) {
            const iterationParams = this.getParameters(this.options.shareParameters, { index: i });

            if (this.options.async) {
                promises.push(
                    (async (p): Promise<void> => {
                        snapshots[p.iteration.index] = await flowService.executeAction(
                            this.snapshot.source,
                            this.snapshot.wd,
                            this.options.action,
                            this.context,
                            p,
                            this.snapshot,
                        );
                    })(iterationParams),
                );
            } else {
                snapshots[i] = await flowService.executeAction(
                    this.snapshot.source,
                    this.snapshot.wd,
                    this.options.action,
                    this.context,
                    iterationParams,
                    this.snapshot,
                );
            }
        }

        await Promise.all(promises);

        // register snapshots in the order of their presence
        snapshots.forEach((childSnapshot) => {
            this.snapshot.registerChildActionSnapshot(childSnapshot);
        });
    }
}

export class RepeatFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.repeat',
        aliases: ['fbl.flow.repeat', 'flow.repeat', 'repeat'],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true,
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return RepeatFlowActionHandler.metadata;
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
        return new RepeatFlowActionProcessor(options, context, snapshot, parameters);
    }
}
