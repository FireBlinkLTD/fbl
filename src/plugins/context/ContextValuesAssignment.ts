import {IActionHandlerMetadata} from '../../interfaces';
import {BaseValuesAssignment} from './BaseValuesAssignment';

const version = require('../../../../package.json').version;

export class ContextValuesAssignment extends BaseValuesAssignment {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.values',
        version: version,
        aliases: [
            'fbl.context.values',
            'context.values',
            'context',
            'ctx'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return ContextValuesAssignment.metadata;
    }

    getAssignmentKey(): 'ctx' | 'secrets' {
        return 'ctx';
    }
}
