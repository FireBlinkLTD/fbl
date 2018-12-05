import {ITemplateUtility, IContext, IDelegatedParameters} from '../../interfaces';
import { ActionSnapshot } from '../../models';
const humanizeDuration = require('humanize-duration');

export class DurationTemplateUtility implements ITemplateUtility {
    /**
     * @inheritdoc
     */
    getUtilities(context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): {[key: string]: any} {
        return {
            duration(milliseconds: number): string {
                return humanizeDuration(milliseconds);
            }
        };
    }
}
