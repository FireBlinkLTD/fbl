import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';

export class SleepFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.sleep',
        aliases: [
            'fbl.flow.sleep',
            'flow.sleep',
            'sleep'
        ]
    };

    private static validationSchema = Joi.alternatives(
        Joi.number().min(0),
        Joi.string().regex(/^\d+(\.\d+)?$/)
    )
        .required();

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return SleepFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return SleepFlowActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await new Promise<void>(resolve => setTimeout(resolve, Number(options) * 1000));
    }
}
