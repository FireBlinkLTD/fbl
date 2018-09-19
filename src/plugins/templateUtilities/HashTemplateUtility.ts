import {ITemplateUtility} from '../../interfaces';
import {createHash} from 'crypto';

export class HashTemplateUtility implements ITemplateUtility {
    getUtilities(wd: string): {[key: string]: any} {
        return {
            hash: (
                str: string,
                algorithm = 'sha256',
                encoding: 'hex' | 'base64' = 'hex'
            ): string => {
                return createHash(algorithm)
                    .update(str)
                    .digest(encoding);
            }
        };
    }
}
