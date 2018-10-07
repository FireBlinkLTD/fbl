import {ITemplateUtility} from '../../interfaces';
import {FSUtil} from '../../utils';
import {readFileSync} from 'fs';

export class FSTemplateUtility implements ITemplateUtility {
    getUtilities(wd: string): {[key: string]: any} {
        return {
            fs: {
                getAbsolutePath(path: string, workingDir = wd): string {
                    return FSUtil.getAbsolutePath(path, workingDir);
                },

                read: {
                    text: (path: string, workingDir = wd): string => {
                        return readFileSync(
                            FSUtil.getAbsolutePath(path, workingDir),
                            'utf8'
                        );
                    },

                    base64: (path: string, workingDir = wd): string => {
                        return readFileSync(
                            FSUtil.getAbsolutePath(path, workingDir)
                        ).toString('base64');
                    }
                }
            }
        };
    }
}
