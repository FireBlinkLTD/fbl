import {IContext, IDelegatedParameters, ITemplateUtility} from '../../interfaces';
import {FSUtil} from '../../utils';
import {readFileSync} from 'fs';
import { ActionSnapshot } from '../../models';

export class FSTemplateUtility implements ITemplateUtility {
    /**
     * @inheritdoc
     */
    getUtilities(context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): {[key: string]: any} {
        return {
            fs: {
                getAbsolutePath(path: string, workingDir = snapshot.wd): string {
                    return FSUtil.getAbsolutePath(path, workingDir);
                },

                read: {
                    text: (path: string, workingDir = snapshot.wd): string => {
                        return readFileSync(
                            FSUtil.getAbsolutePath(path, workingDir),
                            'utf8'
                        );
                    },

                    base64: (path: string, workingDir = snapshot.wd): string => {
                        return readFileSync(
                            FSUtil.getAbsolutePath(path, workingDir)
                        ).toString('base64');
                    }
                }
            }
        };
    }
}
