import { ActionHandler, ActionSnapshot } from '../../models';
import * as Joi from 'joi';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';

export class VoidFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.void',
        aliases: ['fbl.flow.void', 'flow.void', 'void'],
    };

    private static validationSchema = Joi.any().forbidden();

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return VoidFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return VoidFlowActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        /* tslint:disable:no-empty */
    }
}
