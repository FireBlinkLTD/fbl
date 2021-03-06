import { ITemplateUtility, IContext, IDelegatedParameters } from '../interfaces';
import { ActionSnapshot } from '../models';

export class TemplateUtilitiesRegistry {
    private registry: ITemplateUtility[];

    private constructor() {
        this.cleanup();
    }

    private static pInstance: TemplateUtilitiesRegistry;
    public static get instance(): TemplateUtilitiesRegistry {
        if (!this.pInstance) {
            this.pInstance = new TemplateUtilitiesRegistry();
        }

        return this.pInstance;
    }

    public static reset() {
        this.pInstance = null;
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
     * @param {IContext} context action context
     * @param {ActionSnapshot} snapshot action snapshot
     * @param {IDelegatedParameters} parameters action parameters
     * @param {string} wd working directory
     * @return {{[key: string]: any}}
     */
    public generateUtilities(
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
        wd: string,
    ): { [key: string]: any } {
        const result: { [key: string]: any } = {};

        for (const utility of this.registry) {
            Object.assign(result, utility.getUtilities(context, snapshot, parameters, wd));
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
