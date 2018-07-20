import {ActionHandlersRegistry} from './ActionHandlersRegistry';
import {readFile} from 'fs';
import {IContext, IFlow} from '../interfaces';
import {safeLoad, dump} from 'js-yaml';
import {render} from 'ejs';
import {ActionHandler, ActionSnapshot} from '../models';
import 'reflect-metadata';
import {Inject, Service} from 'typedi';
import {promisify} from 'util';
import {isAbsolute, resolve} from 'path';
import * as colors from 'colors';

@Service()
export class FlowService {
    private index = 0;

    /**
     * Turn to true to capture snapshots
     * @type {boolean}
     */
    public debug = false;

    @Inject()
    actionHandlersRegistry: ActionHandlersRegistry;

    /**
     * Execute action
     * @param {string} wd Working Directory
     * @param {string} idOrAlias
     * @param options
     * @param {IContext} context
     * @returns {Promise<void>}
     */
    async executeAction(wd: string, idOrAlias: string, options: any, context: IContext): Promise<ActionSnapshot> {
        const idx = ++this.index;
        console.log(` -> [${idx}] [${idOrAlias}]`.green + ' Processing.');
        const snapshot = new ActionSnapshot(idOrAlias, wd, idx);

        try {
            snapshot.setContext(context);

            const handler = this.actionHandlersRegistry.find(idOrAlias);
            snapshot.setActionHandlerId(handler.getMetadata().id);

            snapshot.setOptions(options);
            options = this.resolveOptions(handler, options, context);
            // register options twice to see what's actually has been changed
            snapshot.setOptions(options);

            await handler.validate(options, context, snapshot);
            snapshot.validated();

            const shouldExecute = await handler.isShouldExecute(options, context, snapshot);
            if (shouldExecute) {
                snapshot.start();
                await handler.execute(options, context, snapshot);
                snapshot.success();

                if (snapshot.successful) {
                    console.log(` <- [${idx}] [${idOrAlias}]`.blue + ' Completed successfully withing ' + snapshot.getHumanReadableDuration().blue);
                } else {
                    console.log(` <- [${idx}] [${idOrAlias}]`.yellow + ' Marked as failed. Took ' + snapshot.getHumanReadableDuration().yellow);
                }
            } else {
                console.log(` <- [${idx}] [${idOrAlias}]`.yellow + ' Skipped');
                snapshot.skipped();
            }
        } catch (e) {
            console.error(` <- [${idx}] [${idOrAlias}]`.red + ` Failed with: ${e.toString().red}`);
            snapshot.failure(e);
        }

        return snapshot;
    }

    /**
     * Get absolute based on current working directory
     * @param {string} path
     * @param {string} wd Working Directory
     * @return {string}
     */
    getAbsolutePath(path: string, wd: string): string {
        if (isAbsolute(path)) {
            return path;
        }

        return resolve(wd, path);
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

    /**
     * Resolve options with no handler check
     * @param options
     * @param {IContext} context
     * @return {any}
     */
    resolveOptionsWithNoHandlerCheck(options: any, context: IContext): any {
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
     * @param {IContext} context
     * @returns {Promise<any>}
     */
    resolveOptions(handler: ActionHandler, options: any, context: IContext): any {
        if (handler.getMetadata().skipTemplateProcessing) {
            return options;
        }

        return this.resolveOptionsWithNoHandlerCheck(options, context);
    }
}
