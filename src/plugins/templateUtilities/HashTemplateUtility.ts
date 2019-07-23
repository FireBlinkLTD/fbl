import { createHash } from 'crypto';
import { isMissing } from 'object-collider';

import { ITemplateUtility, IContext, IDelegatedParameters } from '../../interfaces';
import { ActionSnapshot } from '../../models';
import { ActionError, INVALID_CONFIGURATION } from '../../errors';

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
            hash: (str: string, algorithm: string = 'sha256', encoding: 'hex' | 'base64' = 'hex'): string => {
                if (isMissing(str)) {
                    throw new ActionError('Unable to calculate hash of missing value', INVALID_CONFIGURATION);
                }

                if (typeof str !== 'string') {
                    throw new ActionError('Unable to calculate hash of non-string value', INVALID_CONFIGURATION);
                }

                return createHash(algorithm)
                    .update(str)
                    .digest(encoding);
            },
        };
    }
}
