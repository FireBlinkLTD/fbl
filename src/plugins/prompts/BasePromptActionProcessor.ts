import { ActionProcessor } from '../../models';
import { ActionError } from '../../errors';

const prompts = require('prompts');

export abstract class BasePromptActionProcessor extends ActionProcessor {
    /**
     * Prompt user
     * @param config
     * @return {Promise<any>}
     */
    protected async prompt(config: any): Promise<any> {
        let canceled = false;
        config.name = 'value';
        const value = (await prompts(config, {
            onCancel: () => {
                canceled = true;

                return false;
            },
        })).value;

        if (canceled) {
            throw new ActionError('Prompt canceled by user', 'USER_INTERUPTION');
        }

        return value;
    }
}
