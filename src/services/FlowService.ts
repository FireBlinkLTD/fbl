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

        options = this.resolveOptions(handler, options, context);

        await handler.validate(options, context);

        const shouldExecute = await handler.isShouldExecute(options, context);
        if (shouldExecute) {
            await handler.execute(options, context);
        }
    }

    /**
     * Read and parse yaml file
     * @param {string} file
     * @returns {Promise<any>}
     */
    async readYamlFromFile(file: string): Promise<any> {
        const source = await promisify(readFile)(file, 'utf8');

        return safeLoad(source);
    }

    /**
     * Read flow from file
     * @param {string} file
     * @returns {Promise<IFlow>}
     */
    async readFlowFromFile(file: string): Promise<IFlow> {
        return await this.readYamlFromFile(file) as IFlow;
    }

    resolveOptionsWithNoHandlerCheck(options: any, context: any): any {
        if (options) {
            const tpl = dump(options);
            const yaml = render(tpl, context);
            options = safeLoad(yaml);
        }

        return options;
    }

    /**
     * Resolve options for handler
     * @param {ActionHandler} handler
     * @param options
     * @param context
     * @returns {Promise<any>}
     */
    resolveOptions(handler: ActionHandler, options: any, context: any): any {
        if (handler.getMetadata().skipTemplateProcessing) {
            return options;
        }

        return this.resolveOptionsWithNoHandlerCheck(options, context);
    }
}
