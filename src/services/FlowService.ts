import {ActionHandlersRegistry} from './ActionHandlersRegistry';
import {readFile} from 'fs';
import {IFlow} from '../interfaces';
import {safeLoad, dump} from 'js-yaml';
import {render} from 'ejs';
import {ActionHandler} from '../models';
import 'reflect-metadata';
import {Inject, Service} from 'typedi';
import {promisify} from 'util';

@Service()
export class FlowService {
    @Inject()
    actionHandlersRegistry: ActionHandlersRegistry;

    /**
     * Execute action
     * @param {string} idOrAlias
     * @param options
     * @param context
     * @returns {Promise<void>}
     */
    async executeAction(idOrAlias: string, options: any, context: any): Promise<void> {
        const handler = this.actionHandlersRegistry.find(idOrAlias);
        options = await this.resolveOptions(handler, options, context);

        await handler.validate(options, context);

        const shouldExecute = await handler.isShouldExecute(options, context);
        if (shouldExecute) {
            await handler.execute(options, context);
        }
    }

    /**
     * Read flow from file
     * @param {string} file
     * @returns {Promise<IFlow>}
     */
    async readFlowFromFile(file: string): Promise<IFlow> {
        const source = await promisify(readFile)(file, 'utf8');

        return safeLoad(source) as IFlow;
    }

    /**
     * Resolve options for handler
     * @param {ActionHandler} handler
     * @param options
     * @param context
     * @returns {Promise<any>}
     */
    async resolveOptions(handler: ActionHandler, options: any, context: any): Promise<any> {
        if (handler.getMetadata().skipTemplateProcessing) {
            return options;
        }

        if (options) {
            const tpl = dump(options);
            const yaml = render(tpl, context);
            options = safeLoad(yaml);
        }

        return options;
    }
}
