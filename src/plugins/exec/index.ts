import {IPlugin} from '../../interfaces';
import {ExecActionHandler} from './ExecActionHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'flb.core.context',
    version: version,

    actionHandlers: [
       new ExecActionHandler()
    ],

    requires: {
        fbl: version
    }
};

