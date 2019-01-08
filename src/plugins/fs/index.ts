import {IPlugin} from '../../interfaces';
import {WriteToFileActionHandler} from './WriteToFileActionHandler';
import {MakeDirActionHandler} from './MakeDirActionHandler';
import {RemovePathActionHandler} from './RemovePathActionHandler';
import {MovePathActionHandler} from './MovePathActionHandler';
import {CopyPathActionHandler} from './CopyPathActionHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'fbl.core.fs',
    version: version,

    actionHandlers: [
        new CopyPathActionHandler(),
        new MakeDirActionHandler(),
        new MovePathActionHandler(),
        new RemovePathActionHandler(),
        new WriteToFileActionHandler(),
    ],

    requires: {
        fbl: version
    }
};
