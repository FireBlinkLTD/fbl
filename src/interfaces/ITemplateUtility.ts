import { IContext } from './IContext';
import { IDelegatedParameters } from './IDelegatedParameters';
import { ActionSnapshot } from '../models';

export interface ITemplateUtility {
    /**
     * Construct utilities
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @param {IDelegatedParameters} parameters
     * @param {string} wd working directory
     * @return {{[key: string]: any}}
     */
    getUtilities(
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
        wd: string,
    ): { [key: string]: any };
}
