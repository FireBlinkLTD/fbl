import {IPlugin} from '../../interfaces';
import {ContextValuesAssignment} from './ContextValuesAssignment';
import {SecretValuesAssignment} from './SecretValuesAssignment';
import {MarkEntitiesAsRegistered} from './MarkEntitiesAsRegistered';
import {MarkEntitiesAsUnRegistered} from './MarkEntitiesAsUnRegistered';
import {MarkEntitiesAsCreated} from './MarkEntitiesAsCreated';
import {MarkEntitiesAsUpdated} from './MarkEntitiesAsUpdated';
import {MarkEntitiesAsDeleted} from './MarkEntitiesAsDeleted';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'flb.core.context',
    version: version,

    actionHandlers: [
        new ContextValuesAssignment(),
        new SecretValuesAssignment(),
        new MarkEntitiesAsRegistered(),
        new MarkEntitiesAsUnRegistered(),
        new MarkEntitiesAsCreated(),
        new MarkEntitiesAsUpdated(),
        new MarkEntitiesAsDeleted(),
    ],

    requires: {
        fbl: version
    }
};
