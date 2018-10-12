import {ITemplateUtility} from '../../interfaces';

export class NodeRequireTemplateUtility implements ITemplateUtility {
    getUtilities(wd: string): {[key: string]: any} {
        return {
            require
        };
    }
}
