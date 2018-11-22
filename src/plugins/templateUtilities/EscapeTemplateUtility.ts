import {ITemplateUtility} from '../../interfaces';
import {number} from 'joi';

export class EscapeTemplateUtility implements ITemplateUtility {
    getUtilities(wd: string): {[key: string]: any} {
        return {
            /**
             * Convert anything into JSON string
             * @param value
             * @return {string}
             */
            escape: (value: any): any => {
                if (typeof value === 'number' || typeof value === 'boolean') {
                    return value;
                }

                if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '\\"')}"`;
                }

                throw Error('Unable to escape value. Use $ref:path to pass value by reference.');
            }
        };
    }
}
