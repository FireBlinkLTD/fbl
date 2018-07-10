import {ActionHandler} from '../models';

export interface IPlugin {
    /**
     * Get Action Handlers to register
     * @returns {ActionHandler[]}
     */
    getActionHandlers(): ActionHandler[];
}
