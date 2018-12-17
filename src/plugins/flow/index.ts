import {IPlugin} from '../../interfaces';
import {AttachedFlowActionHandler} from './AttachedFlowActionHandler';
import {EchoActionHandler} from './EchoActionHandler';
import {ForEachFlowActionHandler} from './ForEachFlowActionHandler';
import {ParallelFlowActionHandler} from './ParallelFlowActionHandler';
import {SequenceFlowActionHandler} from './SequenceFlowActionHandler';
import {SwitchFlowActionHandler} from './SwitchFlowActionHandler';
import {RepeatFlowActionHandler} from './RepeatFlowActionHandler';
import {TemplateFlowActionHandler} from './TemplateFlowActionHandler';
import {TryCatchFinallyFlowActionHandler} from './TryCatchFinallyFlowActionHandler';
import {VirtualFlowActionHandler} from './VirtualFlowActionHandler';
import {ErrorActionHandler} from './ErrorActionHandler';
import {WhileActionHandler} from './WhileActionHandler';
import {SleepFlowActionHandler} from './SleepFlowActionHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'fbl.core.flow',
    version: version,

    requires: {
        fbl: version
    },

    actionHandlers: [
        new AttachedFlowActionHandler(),
        new EchoActionHandler(),
        new ErrorActionHandler(),
        new ForEachFlowActionHandler(),
        new ParallelFlowActionHandler(),
        new SequenceFlowActionHandler(),
        new SleepFlowActionHandler(),
        new SwitchFlowActionHandler(),
        new RepeatFlowActionHandler(),
        new TemplateFlowActionHandler(),
        new TryCatchFinallyFlowActionHandler(),
        new VirtualFlowActionHandler(),
        new WhileActionHandler()
    ]
};
