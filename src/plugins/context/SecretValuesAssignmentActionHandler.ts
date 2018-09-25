import {IActionHandlerMetadata} from '../../interfaces';
import {BaseValuesAssignmentActionHandler} from './BaseValuesAssignmentActionHandler';

const version = require('../../../../package.json').version;

export class SecretValuesAssignmentActionHandler extends BaseValuesAssignmentActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.secret.values',
        version: version,
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
