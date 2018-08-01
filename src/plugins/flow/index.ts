import {IPlugin} from '../../interfaces';
import {ActionHandler} from '../../models';
import {AttachedFlowHandler} from './AttachedFlowHandler';
import {ParallelFlowHandler} from './ParallelFlowHandler';
import {SequenceFlowHandler} from './SequenceFlowHandler';
import {SwitchFlowHandler} from './SwitchFlowHandler';
import {RepeatFlowHandler} from './RepeatFlowHandler';

class FlowPlugin implements IPlugin {
    getActionHandlers(): ActionHandler[] {
        return [
            new AttachedFlowHandler(),
            new ParallelFlowHandler(),
            new SequenceFlowHandler(),
            new SwitchFlowHandler(),
            new RepeatFlowHandler()
        ];
    }
}

module.exports = new FlowPlugin();
