import {ITemplateUtility} from '../../interfaces';
import {ContextUtil} from '../../utils';
import {number} from 'joi';

export class EscapeTemplateUtility implements ITemplateUtility {
    getUtilities(wd: string): {[key: string]: any} {
        return {
            /**
             * Convert anything into JSON string
             * @param anything
             * @return {string}
             */
            escape: (anything: any): any => {
                if (typeof anything === 'number' || typeof anything === 'boolean') {
                    return anything;
                }

                if (typeof anything === 'string') {
                    return `"${anything.replace(/"/g, '\\"')}"`;
                }

                return JSON.stringify(anything);
            }
        };
    }
}
