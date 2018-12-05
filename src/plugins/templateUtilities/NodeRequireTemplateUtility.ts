import {ITemplateUtility, IContext, IDelegatedParameters} from '../../interfaces';
import { ActionSnapshot } from '../../models';

export class NodeRequireTemplateUtility implements ITemplateUtility {
    /**
     * @inheritdoc
     */
    getUtilities(context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): {[key: string]: any} {
        return {
            require
        };
    }
}
