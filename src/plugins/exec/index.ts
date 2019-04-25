import { IPlugin } from '../../interfaces';
import { ExecActionHandler } from './ExecActionHandler';
import { ShellActionHandler } from './ShellActionHandler';
import { FunctionActionHandler } from './FunctionActionHandler';

const version: string = require(process.env.FBL_ENV === 'test' ? '../../../package.json' : '../../../../package.json')
    .version;

module.exports = <IPlugin>{
    name: 'flb.core.context',
    version: version,

    actionHandlers: [new ExecActionHandler(), new FunctionActionHandler(), new ShellActionHandler()],

    requires: {
        fbl: version,
    },
};
