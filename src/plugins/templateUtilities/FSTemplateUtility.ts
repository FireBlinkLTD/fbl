import {ITemplateUtility} from '../../interfaces';
import {FSUtil} from '../../utils/FSUtil';
import {readFileSync} from 'fs';

export class FSTemplateUtility implements ITemplateUtility {
    getUtilities(wd: string): {[key: string]: any} {
        return {
            fs: {
                getAbsolutePath(path: string): string {
                    return FSUtil.getAbsolutePath(path, wd);
                },

                read: {
                    text: (path: string): string => {
                        return readFileSync(
                            FSUtil.getAbsolutePath(path, wd),
                            'utf8'
                        );
                    },

                    base64: (path: string): string => {
                        return readFileSync(
                            FSUtil.getAbsolutePath(path, wd)
                        ).toString('base64');
                    }
                }
            }
        };
    }
}
