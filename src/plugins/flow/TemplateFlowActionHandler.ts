import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from 'joi';
import { FlowService } from '../../services';
import { Container } from 'typedi';
import { safeLoad } from 'js-yaml';
import { FBL_ACTION_SCHEMA } from '../../schemas';
import { ActionError, INVALID_CONFIGURATION } from '../../errors';

export class TemplateFlowActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.string().min(1).required().options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return TemplateFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async validate(): Promise<void> {
        await super.validate();

        const action = safeLoad(this.options);
        try {
            Joi.assert(action, FBL_ACTION_SCHEMA);
        } catch (e) {
            throw new ActionError(
                (<Joi.ValidationError>e).details.map((d) => d.message).join('\n'),
                INVALID_CONFIGURATION,
            );
        }
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const flowService = Container.get(FlowService);

        const action = safeLoad(this.options);

        const childSnapshot = await flowService.executeAction(
            this.snapshot.source,
            this.snapshot.wd,
            action,
            this.context,
            this.parameters,
        );
        this.snapshot.registerChildActionSnapshot(childSnapshot);
    }
}

export class TemplateFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.template',
        aliases: ['fbl.flow.template', 'flow.template', 'template', 'tpl'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return TemplateFlowActionHandler.metadata;
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
        return new TemplateFlowActionProcessor(options, context, snapshot, parameters);
    }
}
