import {IPlugin} from '../../interfaces';
import {ContextValuesAssignmentActionHandler} from './ContextValuesAssignmentActionHandler';
import {MarkEntitiesAsRegisteredActionHandler} from './MarkEntitiesAsRegisteredActionHandler';
import {MarkEntitiesAsUnRegisteredActionHandler} from './MarkEntitiesAsUnRegisteredActionHandler';
import {MarkEntitiesAsCreatedActionHandler} from './MarkEntitiesAsCreatedActionHandler';
import {MarkEntitiesAsUpdatedActionHandler} from './MarkEntitiesAsUpdatedActionHandler';
import {MarkEntitiesAsDeletedActionHandler} from './MarkEntitiesAsDeletedActionHandler';
import {SecretValuesAssignmentActionHandler} from './SecretValuesAssignmentActionHandler';
import {FunctionActionHandler} from './FunctionActionHandler';
import {SummaryRecordActionHandler} from './SummaryRecordActionHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'flb.core.context',
    version: version,

    actionHandlers: [
        new ContextValuesAssignmentActionHandler(),
        new FunctionActionHandler(),
        new MarkEntitiesAsRegisteredActionHandler(),
        new MarkEntitiesAsUnRegisteredActionHandler(),
        new MarkEntitiesAsCreatedActionHandler(),
        new MarkEntitiesAsUpdatedActionHandler(),
        new MarkEntitiesAsDeletedActionHandler(),
        new SecretValuesAssignmentActionHandler(),
        new SummaryRecordActionHandler()
    ],

    requires: {
        fbl: version
    }
};
