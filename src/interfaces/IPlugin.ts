import {ActionHandler} from '../models';
import {IReporter} from './IReporter';

export interface IPlugin {
    /**
     * Get execution reporters
     * @return {IReporter[]}
     */
    getReporters?(): IReporter[];

    /**
     * Get Action Handlers to register
     * @returns {ActionHandler[]}
     */
    getActionHandlers?(): ActionHandler[];
}
