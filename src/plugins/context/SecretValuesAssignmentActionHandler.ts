import {IActionHandlerMetadata} from '../../interfaces';
import {BaseValuesAssignmentActionHandler} from './BaseValuesAssignmentActionHandler';

export class SecretValuesAssignmentActionHandler extends BaseValuesAssignmentActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.secret.values',
        aliases: [
            'fbl.secret.values',
            'secret.values',
            'secrets',
            'secret'
        ],
        considerOptionsAsSecrets: true
    };

    getMetadata(): IActionHandlerMetadata {
        return SecretValuesAssignmentActionHandler.metadata;
    }

    getAssignmentKey(): 'ctx' | 'secrets' {
        return 'secrets';
    }
}
