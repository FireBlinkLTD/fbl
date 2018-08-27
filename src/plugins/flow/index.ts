import {IPlugin} from '../../interfaces';
import {AttachedFlowHandler} from './AttachedFlowHandler';
import {ParallelFlowHandler} from './ParallelFlowHandler';
import {SequenceFlowHandler} from './SequenceFlowHandler';
import {SwitchFlowHandler} from './SwitchFlowHandler';
import {RepeatFlowHandler} from './RepeatFlowHandler';
import {TryCatchFinallyFlowHandler} from './TryCatchFinallyFlowHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'fbl.core.flow',
    version: version,

    requires: {
        fbl: version
    },

    actionHandlers: [
        new AttachedFlowHandler(),
        new ParallelFlowHandler(),
        new SequenceFlowHandler(),
        new SwitchFlowHandler(),
        new RepeatFlowHandler(),
        new TryCatchFinallyFlowHandler()
    ]
};
