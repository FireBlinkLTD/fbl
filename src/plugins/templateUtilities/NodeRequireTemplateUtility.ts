import {ITemplateUtility} from '../../interfaces';

export class NodeRequireTemplateUtility implements ITemplateUtility {
    /**
     * @inheritdoc
     */
    getUtilities(wd: string): {[key: string]: any} {
        return {
            require
        };
    }
}
