import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { BaseValuesAssignmentActionProcessor } from './BaseValuesAssignmentActionProcessor';
import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';

export class SecretValuesAssignmentActionProcessor extends BaseValuesAssignmentActionProcessor {
    /**
     * @inheritdoc
     */
    getAssignmentKey(): 'ctx' | 'secrets' {
        return 'secrets';
    }
}

export class SecretValuesAssignmentActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.secret.values',
        aliases: ['fbl.secret.values', 'secret.values', 'secrets', 'secret'],
        considerOptionsAsSecrets: true,
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return SecretValuesAssignmentActionHandler.metadata;
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
        return new SecretValuesAssignmentActionProcessor(options, context, snapshot, parameters);
    }
}
