import { ITemplateUtility, IContext, IDelegatedParameters } from '../../interfaces';
import { ActionSnapshot } from '../../models';
import { v4, v5 } from 'uuid';

export class UUIDTemplateUtility implements ITemplateUtility {
    /**
     * @inheritdoc
     */
    getUtilities(
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): { [key: string]: any } {
        return {
            UUID: {
                v4: (): string => {
                    return v4();
                },

                v5: {
                    DNS: (dns: string): string => {
                        return v5(dns, v5.DNS);
                    },

                    URL: (url: string): string => {
                        return v5(url, v5.URL);
                    },

                    custom: (name: string, uuid: string): string => {
                        return v5(name, uuid);
                    },
                },
            },
        };
    }
}
