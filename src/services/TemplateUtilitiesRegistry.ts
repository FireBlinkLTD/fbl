import {Service} from 'typedi';
import {ITemplateUtility} from '../interfaces';

@Service()
export class TemplateUtilitiesRegistry {
    private registry: ITemplateUtility[];

    constructor() {
        this.cleanup();
    }

    /**
     * Register template utilities
     * @param {ITemplateUtility} templateUtility
     * @return {TemplateUtilitiesRegistry}
     */
    public register(...templateUtility: ITemplateUtility[]): TemplateUtilitiesRegistry {
        this.registry.push(...templateUtility);

        return this;
    }

    /**
     * Unregister template utilities
     * @param {ITemplateUtility} templateUtility
     * @return {TemplateUtilitiesRegistry}
     */
    public unregister(...templateUtility: ITemplateUtility[]): TemplateUtilitiesRegistry {
        for (const utility of templateUtility) {
            this.registry.splice(this.registry.indexOf(utility), 1);
        }

        return this;
    }

    /**
     * Generate utilities for tempalte
     * @param {string} wd - current working directory
     * @return {{[key: string]: any}}
     */
    public generateUtilities(wd: string): {[key: string]: any} {
        const result: {[key: string]: any} = {};

        for (const utility of this.registry) {
            Object.assign(result, utility.getUtilities(wd));
        }

        return result;
    }

    /**
     * Cleanup registry
     * @return {ActionHandlersRegistry}
     */
    public cleanup(): TemplateUtilitiesRegistry {
        this.registry = [];

        return this;
    }
}
