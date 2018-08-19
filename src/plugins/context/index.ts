import {IPlugin} from '../../interfaces';
import {ContextValuesAssignment} from './ContextValuesAssignment';
import {SecretValuesAssignment} from './SecretValuesAssignment';
import {MarkedEntitiesAsRegistered} from './MarkedEntitiesAsRegistered';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'flb.core.context',
    version: version,

    actionHandlers: [
        new ContextValuesAssignment(),
        new SecretValuesAssignment(),
        new MarkedEntitiesAsRegistered()
    ],

    requires: {
        fbl: version
    }
};
