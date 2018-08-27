import {IPlugin} from '../../interfaces';
import {WriteToFile} from './WriteToFile';
import {WriteToTempFile} from './WriteToTempFile';
import {Encrypt} from './Encrypt';
import {Decrypt} from './Decrypt';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'fbl.core.fs',
    version: version,

    actionHandlers: [
        new Encrypt(),
        new Decrypt(),
        new WriteToFile(),
        new WriteToTempFile()
    ],

    requires: {
        fbl: version
    }
};
