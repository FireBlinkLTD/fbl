import {ActionSnapshot} from '../models';

export interface IReporter {
    /**
     * Get report name
     * @return {string}
     */
    getName(): string;

    /**
     * Generate execution report
     * @param {string} output
     * @param {string} options
     * @param {ActionSnapshot} snapshot
     * @return {Promise<void>}
     */
    generate(output: string, options: {[key: string]: any}, snapshot: ActionSnapshot): Promise<void>;
}
