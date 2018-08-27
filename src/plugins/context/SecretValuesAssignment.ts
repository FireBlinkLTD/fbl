import {IActionHandlerMetadata} from '../../interfaces';
import {BaseValuesAssignment} from './BaseValuesAssignment';

const version = require('../../../../package.json').version;

export class SecretValuesAssignment extends BaseValuesAssignment {
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
        return SecretValuesAssignment.metadata;
    }

    getAssignmentKey(): 'ctx' | 'secrets' {
        return 'secrets';
    }
}
