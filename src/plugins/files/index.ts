import {IPlugin} from '../../interfaces';
import {ActionHandler} from '../../models';
import {WriteToFile} from './WriteToFile';
import {WriteToTempFile} from './WriteToTempFile';

class FilePlugin implements IPlugin {
    getActionHandlers(): ActionHandler[] {
        return [
            new WriteToFile(),
            new WriteToTempFile()
        ];
    }
}

module.exports = new FilePlugin();
