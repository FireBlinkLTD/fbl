import {IPlugin} from '../../interfaces';
import {ContextValuesAssignmentActionHandler} from './ContextValuesAssignmentActionHandler';
import {SecretValuesAssignmentActionHandler} from './SecretValuesAssignmentActionHandler';
import {MarkEntitiesAsRegisteredActionHandler} from './MarkEntitiesAsRegisteredActionHandler';
import {MarkEntitiesAsUnRegisteredActionHandler} from './MarkEntitiesAsUnRegisteredActionHandler';
import {MarkEntitiesAsCreatedActionHandler} from './MarkEntitiesAsCreatedActionHandler';
import {MarkEntitiesAsUpdatedActionHandler} from './MarkEntitiesAsUpdatedActionHandler';
import {MarkEntitiesAsDeletedActionHandler} from './MarkEntitiesAsDeletedActionHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'flb.core.context',
    version: version,

    actionHandlers: [
        new ContextValuesAssignmentActionHandler(),
        new SecretValuesAssignmentActionHandler(),
        new MarkEntitiesAsRegisteredActionHandler(),
        new MarkEntitiesAsUnRegisteredActionHandler(),
        new MarkEntitiesAsCreatedActionHandler(),
        new MarkEntitiesAsUpdatedActionHandler(),
        new MarkEntitiesAsDeletedActionHandler(),
    ],

    requires: {
        fbl: version
    }
};
