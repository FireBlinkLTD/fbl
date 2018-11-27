import {ITemplateUtility} from '../../interfaces';
import {createHash} from 'crypto';
import {ContextUtil} from '../../utils';

export class HashTemplateUtility implements ITemplateUtility {
    getUtilities(wd: string): {[key: string]: any} {
        return {
            hash: (
                str: string,
                algorithm = 'sha256',
                encoding: 'hex' | 'base64' = 'hex'
            ): string => {
                if (ContextUtil.isMissing(str)) {
                    throw new Error('Unable to calculate hash of missing value');
                }

                if (typeof str !== 'string') {
                    throw new Error('Unable to calculate hash of non-string value');
                }

                return createHash(algorithm)
                    .update(str)
                    .digest(encoding);
            }
        };
    }
}
