import {IActionHandlerMetadata} from '../../interfaces';
import {BaseValuesAssignmentActionHandler} from './BaseValuesAssignmentActionHandler';

export class ParametersValuesAssignmentActionHandler extends BaseValuesAssignmentActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.parameters.values',
        aliases: [
            'fbl.parameters.values',
            'parameters.values',
            'parameters'
        ],
        considerOptionsAsSecrets: true
    };

    getMetadata(): IActionHandlerMetadata {
        return ParametersValuesAssignmentActionHandler.metadata;
    }

    getAssignmentKey(): 'ctx' | 'secrets' | 'parameters' {
        return 'parameters';
    }
}
