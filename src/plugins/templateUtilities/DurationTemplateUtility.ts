import {ITemplateUtility} from '../../interfaces';
const humanizeDuration = require('humanize-duration');

export class DurationTemplateUtility implements ITemplateUtility {
    getUtilities(wd: string): {[key: string]: any} {
        return {
            duration(milliseconds: number): string {
                return humanizeDuration(milliseconds);
            }
        };
    }
}
