import {ITemplateUtility, IContext, IDelegatedParameters} from '../../interfaces';
import { ActionSnapshot } from '../../models';

const uuidv4 = require('uuid/v4');
const uuidv5 = require('uuid/v5');

export class UUIDTemplateUtility implements ITemplateUtility {
    /**
     * @inheritdoc
     */
    getUtilities(context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): {[key: string]: any} {
        return {
            UUID: {
                v4: (): string => {
                    return uuidv4();
                },

                v5: {
                    DNS: (dns: string): string => {
                        return uuidv5(dns, uuidv5.DNS);
                    },

                    URL: (url: string): string => {
                        return uuidv5(url, uuidv5.URL);
                    },

                    custom: (name: string, uuid: string): string => {
                        return uuidv5(name, uuid);
                    }
                }
            }
        };
    }
}
