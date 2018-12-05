import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {ContextUtil} from '../../utils';
import {BasePromptActionHandler} from './BasePromptActionHandler';
import {FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA} from '../../schemas';

export class ConfirmActionHandler extends BasePromptActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.cli.prompts.confirm',
        aliases: [
            'fbl.cli.prompts.confirm',
            'cli.prompts.confirm',
            'prompts.confirm',
            'confirm'
        ]
    };

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
    getMetadata(): IActionHandlerMetadata {
        return ConfirmActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return ConfirmActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const value = await this.prompt({
            type: 'confirm',
            initial: options.default,
            message: options.message,
        });

        /* istanbul ignore else */
        if (options.assignResponseTo) {
            ContextUtil.assignTo(
                context,
                parameters,
                snapshot,
                options.assignResponseTo,
                value
            );
        }

        /* istanbul ignore else */
        if (options.pushResponseTo) {
            ContextUtil.pushTo(
                context,
                parameters,
                snapshot,
                options.pushResponseTo,
                value
            );
        }
    }
}
