import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import * as Joi from 'joi';
import { FlowService } from '../../services';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';
import { BaseFlowActionProcessor } from './BaseFlowActionProcessor';

export class SequenceFlowActionProcessor extends BaseFlowActionProcessor {
    private static actionsValidationSchema = Joi.array()
        .items(FBL_ACTION_SCHEMA.optional())
        .required()
        .options({ abortEarly: true });

    private static validationSchema = Joi.alternatives(
        SequenceFlowActionProcessor.actionsValidationSchema,
        Joi.object()
            .keys({
                actions: SequenceFlowActionProcessor.actionsValidationSchema.required(),
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
    getValidationSchema(): Joi.Schema | null {
        return SequenceFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        let actions;
        let shareParameters = false;
        if (Array.isArray(this.options)) {
            actions = this.options;
        } else {
            actions = this.options.actions;
            shareParameters = this.options.shareParameters;
        }

        let index = 0;
        for (const action of actions) {
            const actionParameters = this.getParameters(shareParameters, { index });

            const childSnapshot = await FlowService.instance.executeAction(
                this.snapshot.source,
                this.snapshot.wd,
                action,
                this.context,
                actionParameters,
                this.snapshot,
            );
            this.snapshot.registerChildActionSnapshot(childSnapshot);

            index++;

            // stop processing after first failure
            if (!childSnapshot.successful) {
                return;
            }
        }
    }
}

export class SequenceFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.sequence',
        aliases: ['fbl.flow.sequence', 'flow.sequence', 'sequence', 'sync', '--'],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true,
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return SequenceFlowActionHandler.metadata;
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
        return new SequenceFlowActionProcessor(options, context, snapshot, parameters);
    }
}
