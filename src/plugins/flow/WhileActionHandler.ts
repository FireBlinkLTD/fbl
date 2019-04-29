import * as Joi from 'joi';
import { Container } from 'typedi';

import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { FlowService } from '../../services';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';
import { BaseFlowActionProcessor } from './BaseFlowActionProcessor';

export class WhileActionProcessor extends BaseFlowActionProcessor {
    private static validationSchema = Joi.object({
        shareParameters: Joi.boolean(),
        value: Joi.alternatives(Joi.string(), Joi.number(), Joi.boolean()).required(),
        not: Joi.alternatives(Joi.string(), Joi.number(), Joi.boolean()),
        is: Joi.alternatives(Joi.string(), Joi.number(), Joi.boolean()),
        action: FBL_ACTION_SCHEMA,
    })
        .xor('not', 'is')
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return WhileActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async isShouldExecuteWithParameters(parameters: IDelegatedParameters): Promise<boolean> {
        const flowService = Container.get(FlowService);

        if (this.snapshot.childFailure) {
            return false;
        }

        const value = await flowService.resolveOptionsWithNoHandlerCheck(
            this.context.ejsTemplateDelimiters.local,
            this.options.value,
            this.context,
            this.snapshot,
            parameters,
            false,
        );
        if (this.options.is !== undefined) {
            const is = await flowService.resolveOptionsWithNoHandlerCheck(
                this.context.ejsTemplateDelimiters.local,
                this.options.is,
                this.context,
                this.snapshot,
                parameters,
                false,
            );

            return value.toString() === is.toString();
        } else {
            const not = await flowService.resolveOptionsWithNoHandlerCheck(
                this.context.ejsTemplateDelimiters.local,
                this.options.not,
                this.context,
                this.snapshot,
                parameters,
                false,
            );

            return value.toString() !== not.toString();
        }
    }

    /**
     * @inheritdoc
     */
    async isShouldExecute(): Promise<boolean> {
        return await this.isShouldExecuteWithParameters(this.parameters);
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const flowService = Container.get(FlowService);

        let index = 0;
        let actionParameters: any = this.getParameters(this.options.shareParameters, { index });

        let execute = await this.isShouldExecuteWithParameters(actionParameters);
        while (execute) {
            const childSnapshot = await flowService.executeAction(
                this.snapshot.wd,
                this.options.action,
                this.context,
                actionParameters,
                this.snapshot,
            );
            this.snapshot.registerChildActionSnapshot(childSnapshot);

            index++;
            actionParameters = this.getParameters(this.options.shareParameters, { index });
            execute = await this.isShouldExecuteWithParameters(actionParameters);
        }
    }
}

export class WhileActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.while',
        aliases: ['fbl.flow.while', 'flow.while', 'while'],
        // we don't want to process templates inside options in a default way as it may cause processing of templates
        // inside nested actions, but we will need to process "value" as it supposed to use template.
        skipTemplateProcessing: true,
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return WhileActionHandler.metadata;
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
        return new WhileActionProcessor(options, context, snapshot, parameters);
    }
}
