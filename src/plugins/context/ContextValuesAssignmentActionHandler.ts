import {IActionHandlerMetadata} from '../../interfaces';
import {BaseValuesAssignmentActionHandler} from './BaseValuesAssignmentActionHandler';

const version = require('../../../../package.json').version;

export class ContextValuesAssignmentActionHandler extends BaseValuesAssignmentActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.ctx',
        version: version,
        aliases: [
            'fbl.context.ctx',
            'context.ctx',
            'ctx',
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return ContextValuesAssignmentActionHandler.metadata;
    }

    getAssignmentKey(): 'ctx' | 'secrets' {
        return 'ctx';
    }
}
