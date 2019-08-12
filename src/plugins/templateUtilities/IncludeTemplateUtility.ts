import { isMissing } from 'object-collider';

import { ITemplateUtility, IContext, IDelegatedParameters } from '../../interfaces';
import { ActionSnapshot } from '../../models';
import { ActionError, INVALID_CONFIGURATION } from '../../errors';
import { FSUtil } from '../../utils';
import { readFileSync } from 'fs';
import Container from 'typedi';
import { FlowService } from '../../services';
import { dirname } from 'path';

export class IncludeTemplateUtility implements ITemplateUtility {
    /**
     * @inheritdoc
     */
    getUtilities(
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
        wd: string,
    ): { [key: string]: any } {
        return {
            include: async (path: string, extra?: any): Promise<string> => {
                if (isMissing(path)) {
                    throw new ActionError(
                        'Unable to execute "$.include(path)". Path value is missing.',
                        INVALID_CONFIGURATION,
                    );
                }

                const abolutePath = FSUtil.getAbsolutePath(path, wd);

                let template = readFileSync(abolutePath, 'utf8');
                const flowService = Container.get(FlowService);

                const templateWD = dirname(abolutePath);

                template = await flowService.resolveTemplate(
                    context.ejsTemplateDelimiters.global,
                    template,
                    context,
                    snapshot,
                    parameters,
                    extra,
                    templateWD,
                );

                return await flowService.resolveTemplate(
                    context.ejsTemplateDelimiters.local,
                    template,
                    context,
                    snapshot,
                    parameters,
                    extra,
                    templateWD,
                );
            },
        };
    }
}
