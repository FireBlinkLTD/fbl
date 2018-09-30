import {IPlugin} from '../../interfaces';
import {PromptActionHandler} from './PromptActionHandler';
import {ConfirmActionHandler} from './ConfirmActionHandler';
import {MultiSelectActionHandler} from './MultiSelectActionHandler';
import {SelectActionHandler} from './SelectActionHandler';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'fbl.core.fs',
    version: version,

    actionHandlers: [
        new ConfirmActionHandler(),
        new MultiSelectActionHandler(),
        new PromptActionHandler(),
        new SelectActionHandler()
    ],

    requires: {
        fbl: version
    }
};
