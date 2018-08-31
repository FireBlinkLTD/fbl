import {IPlugin} from '../../interfaces';
import {ExecActionHandler} from './ExecActionHandler';
import {ShellActionHandler} from './ShellActionHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'flb.core.context',
    version: version,

    actionHandlers: [
        new ExecActionHandler(),
        new ShellActionHandler()
    ],

    requires: {
        fbl: version
    }
};

