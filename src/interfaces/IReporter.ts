import {ActionSnapshot} from '../models';
import {IReport} from './index';

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
     * @param {IReport} report
     * @return {Promise<void>}
     */
    generate(output: string, options: {[key: string]: any}, report: IReport): Promise<void>;
}
