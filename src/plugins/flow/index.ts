import {IPlugin} from '../../interfaces';
import {ActionHandler} from '../../models';
import {AttachedFlowHandler} from './AttachedFlowHandler';
import {ParallelFlowHandler} from './ParallelFlowHandler';
import {SequenceFlowHandler} from './SequenceFlowHandler';
import {SwitchFlowHandler} from './SwitchFlowHandler';

class FlowPlugin implements IPlugin {
    getActionHandlers(): ActionHandler[] {
        return [
            new AttachedFlowHandler(),
            new ParallelFlowHandler(),
            new SequenceFlowHandler(),
            new SwitchFlowHandler(),
        ];
    }
}

module.exports = new FlowPlugin();
