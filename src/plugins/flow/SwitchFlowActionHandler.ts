import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { Container } from 'typedi';
import * as Joi from 'joi';
import { FlowService } from '../../services';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';

export class SwitchFlowActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object({
        value: Joi.alternatives(Joi.string(), Joi.number(), Joi.boolean()).required(),
        is: Joi.object()
            .pattern(/^/, FBL_ACTION_SCHEMA)
            .min(1)
            .required(),
        else: FBL_ACTION_SCHEMA.optional(),
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return SwitchFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async validate(): Promise<void> {
        const flowService = Container.get(FlowService);

        // register masked options in the snapshot
        const masked = await flowService.resolveOptionsWithNoHandlerCheck(
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

        // resolve value, as it is mostly likely a template and we're not processing options as a template
        this.options.value = await flowService.resolveOptionsWithNoHandlerCheck(
            this.context.ejsTemplateDelimiters.local,
            this.options.value,
            this.context,
            this.snapshot,
            this.parameters,
            false,
        );

        await super.validate();
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const flowService = Container.get(FlowService);

        let action;
        for (const is of Object.keys(this.options.is)) {
            if (is.toString() === this.options.value.toString()) {
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
            this.snapshot.log(`Based on value: ${this.options.value} invoking handler.`);
            const childSnapshot = await flowService.executeAction(
                this.snapshot.wd,
                action,
                this.context,
                this.parameters,
                this.snapshot,
            );
            this.snapshot.registerChildActionSnapshot(childSnapshot);
        } else {
            this.snapshot.log(`Unable to find handler for value: ${this.options.value}`, true);
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
