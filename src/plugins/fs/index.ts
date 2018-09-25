import {IPlugin} from '../../interfaces';
import {EncryptActionHandler} from './EncryptActionHandler';
import {DecryptActionHandler} from './DecryptActionHandler';
import {WriteToFileActionHandler} from './WriteToFileActionHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'fbl.core.fs',
    version: version,

    actionHandlers: [
        new EncryptActionHandler(),
        new DecryptActionHandler(),
        new WriteToFileActionHandler(),
    ],

    requires: {
        fbl: version
    }
};
