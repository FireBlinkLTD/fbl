import {ActionHandlersRegistry} from './ActionHandlersRegistry';
import {IContext, IFlow, IIteration} from '../interfaces';
import {safeLoad, dump} from 'js-yaml';
import {render} from 'ejs';
import {ActionHandler, ActionSnapshot} from '../models';
import 'reflect-metadata';
import {Inject, Service} from 'typedi';
import {FSUtil} from '../utils';
import {IMetadata} from '../interfaces/IMetadata';
import {TemplateUtilitiesRegistry} from './TemplateUtilitiesRegistry';
import {dirname, join} from 'path';
import {x} from 'tar';
import {createWriteStream, unlink} from 'fs';
import {promisify} from 'util';
import * as got from 'got';

const ejsLint = require('ejs-lint');
const tmp = require('tmp-promise');

@Service()
export class FlowService {
    private index = 0;

    public static MASKED = '{MASKED}';

    private flowPathCache: {[key: string]: string};
    private flowResolvers: {[key: string]: Promise<string>};

    constructor() {
        this.flowPathCache = {};
        this.flowResolvers = {};
    }

    /**
     * Turn to true to capture snapshots
     * @type {boolean}
     */
    public debug = false;

    @Inject(() => ActionHandlersRegistry)
    actionHandlersRegistry: ActionHandlersRegistry;

    @Inject(() => TemplateUtilitiesRegistry)
    templateUtilityRegistry: TemplateUtilitiesRegistry;

    /**
     * Execute action
     * @param {string} wd Working Directory
     * @param {string} idOrAlias
     * @param {IMetadata} metadata
     * @param options
     * @param {IContext} context
     * @param {IIteration} [iteration] - child execution iteration
     * @param [additionalTemplateParameters]
     * @returns {Promise<void>}
     */
    async executeAction(wd: string, idOrAlias: string, metadata: IMetadata, options: any, context: IContext, iteration?: IIteration, additionalTemplateParameters?: {[key: string]: any}): Promise<ActionSnapshot> {
        const idx = ++this.index;
        console.log(` -> [${idx}] [${(metadata && metadata.$title) || idOrAlias}]`.green + ' Processing.');
        const snapshot = new ActionSnapshot(idOrAlias, metadata, wd, idx, iteration);

        try {
            snapshot.setContext(context);

            let handler = this.actionHandlersRegistry.find(idOrAlias);
            if (!handler) {
                handler = context.dynamicActionHandlers.find(idOrAlias);
            }

            if (!handler) {
                throw new Error(`Unable to find action handler for: ${idOrAlias}`);
            }

            snapshot.setActionHandlerId(handler.getMetadata().id);

            if (!handler.getMetadata().considerOptionsAsSecrets) {
                snapshot.setOptions(options);
                // register options twice to see what's actually has been changed
                snapshot.setOptions(this.resolveOptions(wd, handler, options, context, true, iteration, additionalTemplateParameters));
            } else {
                snapshot.setOptions(FlowService.MASKED);
            }

            // resolve without masking
            options = this.resolveOptions(wd, handler, options, context, false, iteration, additionalTemplateParameters);

            await handler.validate(options, context, snapshot);
            snapshot.validated();

            const shouldExecute = await handler.isShouldExecute(options, context, snapshot);
            if (shouldExecute) {
                snapshot.start();
                await handler.execute(options, context, snapshot);
                snapshot.success();

                if (snapshot.successful) {
                    console.log(` <- [${idx}] [${(metadata && metadata.$title) || idOrAlias}]`.blue + ' Completed successfully withing ' + snapshot.getHumanReadableDuration().blue);
                } else {
                    console.log(` <- [${idx}] [${(metadata && metadata.$title) || idOrAlias}]`.yellow + ' Marked as failed. Took ' + snapshot.getHumanReadableDuration().yellow);
                }
            } else {
                console.log(` <- [${idx}] [${(metadata && metadata.$title) || idOrAlias}]`.yellow + ' Skipped');
                snapshot.skipped();
            }
        } catch (e) {
            console.error(` <- [${idx}] [${(metadata && metadata.$title) || idOrAlias}]`.red + ` Failed with: ${e.toString().red}`);
            snapshot.failure(e);
        }

        return snapshot;
    }

    /**
     * Download tarball into temp location
     * @param {string} url
     * @param {number} [redirectCount]
     * @return {Promise<string>} temp tarball location
     */
    private static async downloadTarball(url: string, redirectCount = 0): Promise<string> {
        console.log(' -> Downloading tarball from remote URL: '.green + url);

        const tarballFile = await tmp.file({
            postfix: '.tar.gz'
        });

        const ws = createWriteStream(tarballFile.path);
        let error = false;
        try {
            await new Promise((resolve, reject) => {
                const stream = got.stream(url, {
                    timeout: 120 * 1000
                });

                stream.pipe(ws);

                stream.on('end', resolve);
                stream.on('error', reject);
            });
        } catch (e) {
            error = true;
            throw e;
        } finally {
            ws.close();
            if (error) {
                await promisify(unlink)(tarballFile.path);
            }
        }

        return tarballFile.path;
    }

    /**
     * Extract tarball to temp dir
     * @param {string} path
     * @return {Promise<string>} path to temp dir
     */
    private static async extractTarball(path: string): Promise<string> {
        console.log(' -> Extracting tarball at path: '.green + path);
        const tarball = path;
        const result = (await tmp.dir()).path;

        await x({
            file: tarball,
            C: result
        });

        return result;
    }

    async resolveFlowSkipChecks(path: string, wd: string): Promise<string> {
        let absolutePath;

        if (path.startsWith('http://') || path.startsWith('https://')) {
            absolutePath = await FlowService.downloadTarball(path);
        } else {
            absolutePath = FSUtil.getAbsolutePath(path, wd);
        }

        // if path leads to tarball - extract it to temp dir
        if (absolutePath.endsWith('.tar.gz')) {
            absolutePath = await FlowService.extractTarball(absolutePath);
        }

        // if path lead to directory - use index.yml inside it as a starting point
        const directory = await FSUtil.isDirectory(absolutePath);
        if (directory) {
            absolutePath = join(absolutePath, 'index.yml');
            this.flowPathCache[path] = absolutePath;
        }

        return absolutePath;
    }

    /**
     * Resolve flow based on path
     * @param {string} path
     * @param {string} wd
     * @return {Promise<string>}
     */
    async resolveFlow(path: string, wd: string): Promise<string> {
        if (this.flowPathCache[path]) {
            return this.flowPathCache[path];
        }

        let resolver: Promise<string> = this.flowResolvers[path];

        if (resolver) {
            return await resolver;
        }

        resolver = this.resolveFlowSkipChecks(path, wd);
        this.flowResolvers[path] = resolver;
        const result = await resolver;
        delete this.flowResolvers[path];

        return result;
    }

    /**
     * Read flow from file
     * @param {string} path
     * @param {IContext} context
     * @param {string} wd working directory
     * @returns {Promise<IFlow>}
     */
    async readFlowFromFile(path: string, context: IContext, wd: string): Promise<{flow: IFlow, wd: string}> {
        const absolutePath = await this.resolveFlow(path, wd);

        console.log(` -> Reading flow file:`.green + absolutePath);
        let content = await FSUtil.readTextFile(absolutePath);

        content = this.resolveTemplate(
            context.ejsTemplateDelimiters.global,
            wd,
            content,
            context
        );

        let flow;
        try {
            flow = safeLoad(content) as IFlow;
        } catch (e) {
            console.error(` -> Reading flow failed from file:`.red + absolutePath + ' Error: ' + e.message.red);
            console.error(content.gray);
            throw (e);
        }

        return {flow, wd: dirname(absolutePath)};
    }

    /**
     * Resolve template
     * @param {string} delimiter - EJS template delimiter
     * @param {string} wd - working directory
     * @param {string} tpl - template to resolve
     * @param {IContext} context
     * @param {IIteration} [iteration]
     * @param [additionalTemplateParameters]
     * @return {string}
     */
    resolveTemplate(
        delimiter: string,
        wd: string,
        tpl: string,
        context: IContext,
        iteration?: IIteration,
        additionalTemplateParameters?: {[key: string]: any}
    ): string {
        // validate template
        ejsLint(tpl, { delimiter });

        const data: any = {
            $: this.templateUtilityRegistry.generateUtilities(wd),
            env: process.env
        };

        if (additionalTemplateParameters) {
            Object.assign(data, additionalTemplateParameters);
        }

        Object.assign(data, context);
        if (iteration) {
            Object.assign(data, {
                iteration
            });
        }

        return render(tpl, data, { delimiter });
    }

    /**
     * Resolve options with no handler check
     * @param {string} delimiter - EJS template delimiter, by default EJS is using %
     * @param {string} wd current working directory
     * @param options
     * @param {IContext} context
     * @param {boolean} [maskSecrets] if true - all secrets will be masked
     * @param {IIteration} [iteration] execution iteration
     * @param [additionalTemplateParameters]
     * @return {any}
     */
    resolveOptionsWithNoHandlerCheck(
        delimiter: string,
        wd: string,
        options: any,
        context: IContext,
        maskSecrets: boolean,
        iteration?: IIteration,
        additionalTemplateParameters?: {[key: string]: any}
    ): any {
        if (maskSecrets && context.secrets && Object.keys(context.secrets).length) {
            // make a copy of the options object first
            let json = JSON.stringify(options);

            const pattern = `<${delimiter}[^${delimiter}>|\\w]*[^\\w]+(secrets[^\\w])[^${delimiter}>]*${delimiter}>`;
            const regex = new RegExp(pattern, 'g');
            json = json.replace(regex, FlowService.MASKED);
            options = JSON.parse(json);
        }

        if (options) {
            let tpl = dump(options);

            // fix template after dump
            // while in yaml following string is fully valid '<%- ctx[''name''] %>'
            // for EJS it is broken due to quotes escape
            const lines: string[] = [];
            const ejsTemplateRegEx = new RegExp(`<${delimiter}([^${delimiter}>]*)${delimiter}>`, 'g');
            const doubleQuotesRegEx = /''/g;
            tpl.split('\n').forEach(line => {
               if (line.indexOf('\'\'') !== -1) {
                   // we only want to replace '' to ' inside the EJS template
                   line = line.replace(ejsTemplateRegEx, function (match, g1): string {
                        return `<${delimiter}${g1.replace(doubleQuotesRegEx, '\'')}${delimiter}>`;
                   });
               }

               lines.push(line);
            });

            tpl = lines.join('\n');
            const yaml = this.resolveTemplate(delimiter, wd, tpl, context, iteration, additionalTemplateParameters);
            options = safeLoad(yaml);
        }

        return options;
    }

    /**
     * Resolve options for handler
     * @param {string} wd current working directory
     * @param {ActionHandler} handler
     * @param options
     * @param {IContext} context
     * @param {boolean} [maskSecrets] if true - all secrets will be masked
     * @param {IIteration} [iteration] execution iteration
     * @param [additionalTemplateParameters]
     * @returns {Promise<any>}
     */
    resolveOptions(wd: string, handler: ActionHandler, options: any, context: IContext, maskSecrets: boolean, iteration?: IIteration, additionalTemplateParameters?: {[key: string]: any}): any {
        if (handler.getMetadata().skipTemplateProcessing) {
            return options;
        }

        return this.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, wd, options, context, maskSecrets, iteration, additionalTemplateParameters);
    }
}
