import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import * as Joi from '@hapi/joi';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';

export class VoidFlowActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.any().forbidden();

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return VoidFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        /* tslint:disable:no-empty */
    }
}

export class VoidFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.void',
        aliases: ['fbl.flow.void', 'flow.void', 'void'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return VoidFlowActionHandler.metadata;
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
        return new VoidFlowActionProcessor(options, context, snapshot, parameters);
    }
}
