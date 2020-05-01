import { ActionSnapshot, ActionHandler, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from '@hapi/joi';
import { ContextUtil } from '../../utils';
import { BasePromptActionProcessor } from './BasePromptActionProcessor';
import { FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA } from '../../schemas';

export class ConfirmActionProcessor extends BasePromptActionProcessor {
    private static validationSchema = Joi.object({
        message: Joi.string().required().min(1),

        default: Joi.boolean(),

        assignResponseTo: FBL_ASSIGN_TO_SCHEMA,
        pushResponseTo: FBL_PUSH_TO_SCHEMA,
    })
        .or('assignResponseTo', 'pushResponseTo')
        .required();

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return ConfirmActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const value = await this.prompt({
            type: 'confirm',
            initial: this.options.default,
            message: this.options.message,
        });

        /* istanbul ignore else */
        if (this.options.assignResponseTo) {
            ContextUtil.assignTo(this.context, this.parameters, this.snapshot, this.options.assignResponseTo, value);
        }

        /* istanbul ignore else */
        if (this.options.pushResponseTo) {
            ContextUtil.pushTo(this.context, this.parameters, this.snapshot, this.options.pushResponseTo, value);
        }
    }
}

export class ConfirmActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.cli.prompts.confirm',
        aliases: ['fbl.cli.prompts.confirm', 'cli.prompts.confirm', 'prompts.confirm', 'confirm'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return ConfirmActionHandler.metadata;
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
        return new ConfirmActionProcessor(options, context, snapshot, parameters);
    }
}
