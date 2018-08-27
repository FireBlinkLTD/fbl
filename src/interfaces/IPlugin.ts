import {ActionHandler} from '../models';
import {IReporter} from './IReporter';

export interface IPlugin {
    /**
     * Plugin name
     */
    name: string;

    /**
     * Plugin version
     */
    version: string;

    /**
     * Dependencies
     */
    requires: {
        fbl: string;
        plugins?: {[id: string]: string}
    };

    /**
     * Optional tags associated with plugin
     */
    tags?: string[];

    /**
     * Human readable description
     */
    description?: string;

    /**
     * Get execution reporters
     */
    reporters?: IReporter[];

    /**
     * Get Action Handlers to register
     */
    actionHandlers?: ActionHandler[];
}
