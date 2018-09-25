import {IActionHandlerMetadata} from '../../interfaces';
import {BaseValuesAssignmentActionHandler} from './BaseValuesAssignmentActionHandler';

const version = require('../../../../package.json').version;

export class ContextValuesAssignmentActionHandler extends BaseValuesAssignmentActionHandler {
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
        return ContextValuesAssignmentActionHandler.metadata;
    }

    getAssignmentKey(): 'ctx' | 'secrets' {
        return 'ctx';
    }
}
