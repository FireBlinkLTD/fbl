import {ActionHandler} from '../../models';

const prompts = require('prompts');

export abstract class BasePromptActionHandler extends ActionHandler {
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
            }
        })).value;

        if (canceled) {
            throw new Error('Prompt canceled by user');
        }

        return value;
    }
}
