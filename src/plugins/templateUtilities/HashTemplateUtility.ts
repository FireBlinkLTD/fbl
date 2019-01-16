import { ITemplateUtility, IContext, IDelegatedParameters } from '../../interfaces';
import { createHash } from 'crypto';
import { ContextUtil } from '../../utils';
import { ActionSnapshot } from '../../models';
import { isMissing } from 'object-collider';

export class HashTemplateUtility implements ITemplateUtility {
    /**
     * @inheritdoc
     */
    getUtilities(
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): { [key: string]: any } {
        return {
            hash: (str: string, algorithm = 'sha256', encoding: 'hex' | 'base64' = 'hex'): string => {
                if (isMissing(str)) {
                    throw new Error('Unable to calculate hash of missing value');
                }

                if (typeof str !== 'string') {
                    throw new Error('Unable to calculate hash of non-string value');
                }

                return createHash(algorithm)
                    .update(str)
                    .digest(encoding);
            },
        };
    }
}
