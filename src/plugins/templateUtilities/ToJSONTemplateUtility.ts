import {ITemplateUtility} from '../../interfaces';

export class ToJSONTemplateUtility implements ITemplateUtility {
    getUtilities(wd: string): {[key: string]: any} {
        return {
            /**
             * Convert anything into JSON string
             * @param anything
             * @return {string}
             */
            toJSON: (anything: any): string => {
                return JSON.stringify(anything);
            }
        };
    }
}
