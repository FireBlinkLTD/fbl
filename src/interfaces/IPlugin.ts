import { ActionHandler } from '../models';
import { IReporter } from './IReporter';
import { ITemplateUtility } from './ITemplateUtility';

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
        plugins?: { [id: string]: string };
        applications?: string[];
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

    /**
     * Custom template utilities
     */
    templateUtils?: ITemplateUtility[];
}
