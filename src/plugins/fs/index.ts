import {IPlugin} from '../../interfaces';
import {EncryptActionHandler} from './EncryptActionHandler';
import {DecryptActionHandler} from './DecryptActionHandler';
import {WriteToFileActionHandler} from './WriteToFileActionHandler';
import {MakeDirActionHandler} from './MakeDirActionHandler';
import {RemovePathActionHandler} from './RemovePathActionHandler';
import {MovePathActionHandler} from './MovePathActionHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'fbl.core.fs',
    version: version,

    actionHandlers: [
        new EncryptActionHandler(),
        new DecryptActionHandler(),
        new MakeDirActionHandler(),
        new MovePathActionHandler(),
        new RemovePathActionHandler(),
        new WriteToFileActionHandler(),
    ],

    requires: {
        fbl: version
    }
};
