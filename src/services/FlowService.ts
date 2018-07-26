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

const ejsLint = require('ejs-lint');

@Service()
export class FlowService {
    private index = 0;

    public static MASKED = '{MASKED}';

    /**
     * Turn to true to capture snapshots
     * @type {boolean}
     */
    public debug = false;

    @Inject()
    actionHandlersRegistry: ActionHandlersRegistry;

    /**
     * Generate empty context
     * @return {IContext}
     */
    public static generateEmptyContext(): IContext {
        return <IContext> {
            ctx: {},
            secrets: {},
            entities: {
                registered: [],
                unregistered: [],
                created: [],
                updated: [],
                deleted: []
            }
        };
    }

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

            if (!handler.getMetadata().considerOptionsAsSecrets) {
                snapshot.setOptions(options);
                // register options twice to see what's actually has been changed
                snapshot.setOptions(this.resolveOptions(handler, options, context, true));
            } else {
                snapshot.setOptions(FlowService.MASKED);
            }

            // resolve without masking
            options = this.resolveOptions(handler, options, context);

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
     * @param {boolean} [maskSecrets] if true - all secrets will be masked
     * @return {any}
     */
    resolveOptionsWithNoHandlerCheck(options: any, context: IContext, maskSecrets?: boolean): any {
        if (maskSecrets && context.secrets && Object.keys(context.secrets).length) {
            // make a copy of the context object first
            let json = JSON.stringify(options);
            const regex = /<%[^%>|\w]*[^\w]+(secrets[^\w])[^%>]*%>/g;
            json = json.replace(regex, FlowService.MASKED);
            options = JSON.parse(json);
        }

        if (options) {
            let tpl = dump(options);

            // fix template after dump
            // while in yaml following string is fully valid '<%- ctx[''name''] %>'
            // for EJS it is broken due to quotes escape
            const lines: string[] = [];
            const ejsTemplateRegEx = /<%([^%>]*)%>/g;
            const doubleQuotesRegEx = /''/g;
            tpl.split('\n').forEach(line => {
               if (line.indexOf('\'\'') !== -1) {
                   // we only want to replace '' to ' inside the EJS template
                   line = line.replace(ejsTemplateRegEx, function (match, g1): string {
                        return `<%${g1.replace(doubleQuotesRegEx, '\'')}%>`;
                   });
               }

               lines.push(line);
            });

            tpl = lines.join('\n');

            // validate template
            ejsLint(tpl);

            const yaml = render(lines.join('\n'), context);
            options = safeLoad(yaml);
        }

        return options;
    }

    /**
     * Resolve options for handler
     * @param {ActionHandler} handler
     * @param options
     * @param {IContext} context
     * @param {boolean} [maskSecrets] if true - all secrets will be masked
     * @returns {Promise<any>}
     */
    resolveOptions(handler: ActionHandler, options: any, context: IContext, maskSecrets?: boolean): any {
        if (handler.getMetadata().skipTemplateProcessing) {
            return options;
        }

        return this.resolveOptionsWithNoHandlerCheck(options, context, maskSecrets);
    }
}
