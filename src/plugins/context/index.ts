import {IPlugin} from '../../interfaces';
import {ActionHandler} from '../../models';
import {ContextValuesAssignment} from './ContextValuesAssignment';
import {SecretValuesAssignment} from './SecretValuesAssignment';
import {MarkedEntitiesAsRegistered} from './MarkedEntitiesAsRegistered';

class ContextPlugin implements IPlugin {
    getActionHandlers(): ActionHandler[] {
        return [
            new ContextValuesAssignment(),
            new SecretValuesAssignment(),
            new MarkedEntitiesAsRegistered()
        ];
    }
}

module.exports = new ContextPlugin();
