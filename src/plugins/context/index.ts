import {IPlugin} from '../../interfaces';
import {ContextValuesAssignmentActionHandler} from './ContextValuesAssignmentActionHandler';
import {MarkEntitiesAsRegisteredActionHandler} from './MarkEntitiesAsRegisteredActionHandler';
import {MarkEntitiesAsUnRegisteredActionHandler} from './MarkEntitiesAsUnRegisteredActionHandler';
import {MarkEntitiesAsCreatedActionHandler} from './MarkEntitiesAsCreatedActionHandler';
import {MarkEntitiesAsUpdatedActionHandler} from './MarkEntitiesAsUpdatedActionHandler';
import {MarkEntitiesAsDeletedActionHandler} from './MarkEntitiesAsDeletedActionHandler';
import {SecretValuesAssignmentActionHandler} from './SecretValuesAssignmentActionHandler';
import {SummaryRecordActionHandler} from './SummaryRecordActionHandler';
import {ParametersValuesAssignmentActionHandler} from './ParametersValuesAssignmentActionHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'flb.core.context',
    version: version,

    actionHandlers: [
        new ContextValuesAssignmentActionHandler(),
        new MarkEntitiesAsRegisteredActionHandler(),
        new MarkEntitiesAsUnRegisteredActionHandler(),
        new MarkEntitiesAsCreatedActionHandler(),
        new MarkEntitiesAsUpdatedActionHandler(),
        new MarkEntitiesAsDeletedActionHandler(),
        new ParametersValuesAssignmentActionHandler(),
        new SecretValuesAssignmentActionHandler(),
        new SummaryRecordActionHandler()
    ],

    requires: {
        fbl: version
    }
};
