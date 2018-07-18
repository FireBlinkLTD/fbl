import {IPlugin} from '../../interfaces';
import {ActionHandler} from '../../models';
import {ContextValuesAssignment} from './ContextValuesAssignment';

class ContextPlugin implements IPlugin {
    getActionHandlers(): ActionHandler[] {
        return [
            new ContextValuesAssignment()
        ];
    }
}

module.exports = new ContextPlugin();
