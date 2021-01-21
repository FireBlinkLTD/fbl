import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import * as Joi from 'joi';
import { FlowService } from '../../services';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';

export class SwitchFlowActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object({
        value: Joi.alternatives(Joi.string(), Joi.number(), Joi.boolean()).required(),
        is: Joi.object().pattern(/^/, FBL_ACTION_SCHEMA).min(1).required(),
        else: FBL_ACTION_SCHEMA.optional(),
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return SwitchFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        // register masked options in the snapshot
        const masked = await FlowService.instance.resolveOptionsWithNoHandlerCheck(
            this.context.ejsTemplateDelimiters.local,
            this.options.value,
            this.context,
            this.snapshot,
            this.parameters,
            true,
        );

        this.snapshot.setOptions({
            value: masked,
            is: this.options.is,
        });

        const value = await FlowService.instance.resolveOptionsWithNoHandlerCheck(
            this.context.ejsTemplateDelimiters.local,
            this.options.value,
            this.context,
            this.snapshot,
            this.parameters,
            false,
        );

        let action;
        for (const is of Object.keys(this.options.is)) {
            if (is.toString() === value.toString()) {
                action = this.options.is[is];
                break;
            }
        }

        if (!action) {
            if (this.options.else) {
                action = this.options.else;
            }
        }

        if (action) {
            this.snapshot.log(`Based on value: ${value} invoking handler.`);
            const childSnapshot = await FlowService.instance.executeAction(
                this.snapshot.source,
                this.snapshot.wd,
                action,
                this.context,
                this.parameters,
                this.snapshot,
            );
            this.snapshot.registerChildActionSnapshot(childSnapshot);
        } else {
            this.snapshot.log(`Unable to find handler for value: ${value}`, true);
        }
    }
}

export class SwitchFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.switch',
        aliases: ['fbl.flow.switch', 'flow.switch', 'switch', 'if', '?'],
        // we don't want to process templates inside options in a default way as it may cause processing of templates
        // inside nested actions, but we will need to process "value" as it supposed to use template.
        skipTemplateProcessing: true,
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return SwitchFlowActionHandler.metadata;
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
        return new SwitchFlowActionProcessor(options, context, snapshot, parameters);
    }
}
