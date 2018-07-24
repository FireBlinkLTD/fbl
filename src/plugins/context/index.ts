import {IPlugin} from '../../interfaces';
import {ActionHandler} from '../../models';
import {ContextValuesAssignment} from './ContextValuesAssignment';
import {SecretValuesAssignment} from './SecretValuesAssignment';

class ContextPlugin implements IPlugin {
    getActionHandlers(): ActionHandler[] {
        return [
            new ContextValuesAssignment(),
            new SecretValuesAssignment()
        ];
    }
}

module.exports = new ContextPlugin();
