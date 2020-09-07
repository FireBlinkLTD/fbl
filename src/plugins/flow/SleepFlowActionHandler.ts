import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import * as Joi from 'joi';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';

export class SleepFlowActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.alternatives(
        Joi.number().min(0),
        Joi.string().regex(/^\d+(\.\d+)?$/),
    ).required();

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return SleepFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        await new Promise<void>((resolve) => setTimeout(resolve, Number(this.options) * 1000));
    }
}

export class SleepFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.sleep',
        aliases: ['fbl.flow.sleep', 'flow.sleep', 'sleep'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return SleepFlowActionHandler.metadata;
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
        return new SleepFlowActionProcessor(options, context, snapshot, parameters);
    }
}
