import {ActionHandlersRegistry} from './ActionHandlersRegistry';
import {IContext, IDelegatedParameters, IFlow, IFlowLocationOptions} from '../interfaces';
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
import {createWriteStream, readdir, unlink} from 'fs';
import {promisify} from 'util';
import * as got from 'got';
import {TempPathsRegistry} from './TempPathsRegistry';

const ejsLint = require('ejs-lint');

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

    @Inject(() => TempPathsRegistry)
    tempPathsRegistry: TempPathsRegistry;

    /**
     * Execute action
     * @param {string} wd Working Directory
     * @param {string} idOrAlias
     * @param {IMetadata} metadata
     * @param options
     * @param {IContext} context
     * @param {IDelegatedParameters} parameters
     * @param [parameters]
     * @returns {Promise<void>}
     */
    async executeAction(wd: string, idOrAlias: string, metadata: IMetadata, options: any, context: IContext, parameters: IDelegatedParameters): Promise<ActionSnapshot> {
        const idx = ++this.index;
        console.log(` -> [${idx}] [${(metadata && metadata.$title) || idOrAlias}]`.green + ' Processing.');
        const snapshot = new ActionSnapshot(idOrAlias, metadata, wd, idx, parameters);

        try {
            snapshot.setInitialContextState(context);

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
                // register options twice to see what's actually has been changed (only when changes applied)
                const resolvedOptions = this.resolveOptions(wd, handler, options, context, true, parameters);
                if (JSON.stringify(options) !== JSON.stringify(resolvedOptions)) {
                    snapshot.setOptions(resolvedOptions);
                }
            } else {
                snapshot.setOptions(FlowService.MASKED);
            }

            // resolve without masking
            options = this.resolveOptions(wd, handler, options, context, false, parameters);

            await handler.validate(options, context, snapshot, parameters);
            snapshot.validated();

            const shouldExecute = await handler.isShouldExecute(options, context, snapshot, parameters);
            if (shouldExecute) {
                snapshot.start();
                await handler.execute(options, context, snapshot, parameters);
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
     * @param {IFlowLocationOptions} location
     * @param {number} [redirectCount]
     * @return {Promise<string>} temp tarball location
     */
    private async downloadTarball(location: IFlowLocationOptions, redirectCount = 0): Promise<string> {
        console.log(' -> Downloading tarball from remote URL: '.green + location.path);

        const tarballFile = await this.tempPathsRegistry.createTempFile(false, '.tar.gz');

        const ws = createWriteStream(tarballFile);
        try {
            await new Promise((resolve, reject) => {
                const stream = got.stream(location.path, {
                    timeout: 120 * 1000,
                    headers: location.http && location.http.headers
                });

                stream.pipe(ws);

                ws.on('finish', resolve);
                stream.on('error', reject);
            });
        } catch (e) {
            await promisify(unlink)(tarballFile);
            throw e;
        }

        return tarballFile;
    }

    /**
     * Extract tarball to temp dir
     * @param {string} path
     * @return {Promise<string>} path to temp dir
     */
    private async extractTarball(path: string): Promise<string> {
        console.log(' -> Extracting tarball at path: '.green + path);
        const tarball = path;
        const result = await this.tempPathsRegistry.createTempDir();

        await x({
            file: tarball,
            C: result
        });

        return result;
    }

    /**
     * Recursively find index.yml in directory structure
     * @param {string} path
     * @return {Promise<string>}
     */
    async recursivelyFindIndexFileInDir(path: string): Promise<string> {
        let contents = await promisify(readdir)(path);

        // filter all files and folders that start with "."
        contents = contents.filter(fileOrDir => !fileOrDir.startsWith('.'));

        const match = contents.find(dirOrFile => {
            return dirOrFile === 'index.yml' || dirOrFile === 'index.yaml';
        });

        if (match) {
            const dirOrFile = join(path, match);
            const isDir = await FSUtil.isDirectory(dirOrFile);
            if (!isDir) {
                return dirOrFile;
            }
        }

        if (contents.length === 1) {
            const dirOrFile = join(path, contents[0]);
            const isDir = await FSUtil.isDirectory(dirOrFile);

            if (isDir) {
                return await this.recursivelyFindIndexFileInDir(dirOrFile);
            }
        }

        throw new Error('Unable to locate index file inside the directory.');
    }

    /**
     * Resolve flow, skipping checks if similar resolve action is already running
     * @param {IFlowLocationOptions} location
     * @return {Promise<string>}
     */
    async resolveFlowSkipChecks(location: IFlowLocationOptions): Promise<string> {
        let absolutePath = location.path;

        if (location.path.startsWith('http://') || location.path.startsWith('https://')) {
            absolutePath = await this.downloadTarball(location);
        }

        // if path leads to tarball - extract it to temp dir
        if (absolutePath.endsWith('.tar.gz')) {
            absolutePath = await this.extractTarball(absolutePath);
        }

        this.flowPathCache[location.path] = absolutePath;

        return absolutePath;
    }

    async resolveFlowTarget(local: string, location: IFlowLocationOptions): Promise<string> {
        // if path lead to directory - use index.yml inside it as a starting point
        const directory = await FSUtil.isDirectory(local);
        if (directory) {
            if (location.target) {
                local = join(local, location.target);
            } else {
                local = await this.recursivelyFindIndexFileInDir(local);
            }
        } else {
            if (location.target) {
                throw new Error(`Usage of target is not allowed for flow at path: ${location.path}`);
            }
        }

        return local;
    }

    /**
     * Resolve flow based on path
     * @param {IFlowLocationOptions} location
     * @return {Promise<string>}
     */
    async resolveFlow(location: IFlowLocationOptions): Promise<string> {
        if (!FSUtil.isAbsolute(location.path) && !FSUtil.isURL(location.path)) {
            throw new Error(`Provided path ${location.path} is not absolute.`);
        }

        if (this.flowPathCache[location.path]) {
            const cachedPath = this.flowPathCache[location.path];

            return await this.resolveFlowTarget(cachedPath, location);
        }

        let resolver: Promise<string> = this.flowResolvers[location.path];
        if (resolver) {
            const cachedPath = await resolver;

            return await this.resolveFlowTarget(cachedPath, location);
        }

        resolver = this.resolveFlowSkipChecks(location);
        this.flowResolvers[location.path] = resolver;
        const result = await resolver;
        delete this.flowResolvers[location.path];

        return await this.resolveFlowTarget(result, location);
    }

    /**
     * Read flow from file
     * @param {IFlowLocationOptions} location
     * @param {IContext} context
     * @param {IDelegatedParameters} parameters
     * @param {string} wd working directory
     * @returns {Promise<IFlow>}
     */
    async readFlowFromFile(location: IFlowLocationOptions, context: IContext, parameters: IDelegatedParameters, wd: string): Promise<{flow: IFlow, wd: string}> {
        const absolutePath = await this.resolveFlow(location);

        console.log(` -> Reading flow file:`.green + absolutePath);
        let content = await FSUtil.readTextFile(absolutePath);

        content = this.resolveTemplate(
            context.ejsTemplateDelimiters.global,
            wd,
            content,
            context,
            parameters
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
     * @param {IDelegatedParameters} parameters
     * @return {string}
     */
    resolveTemplate(
        delimiter: string,
        wd: string,
        tpl: string,
        context: IContext,
        parameters: IDelegatedParameters
    ): string {
        // validate template
        ejsLint(tpl, { delimiter });

        const data: any = {
            $: this.templateUtilityRegistry.generateUtilities(wd),
            env: process.env
        };

        Object.assign(data, parameters);
        Object.assign(data, context);

        return render(tpl, data, { delimiter });
    }

    /**
     * Resolve options with no handler check
     * @param {string} delimiter - EJS template delimiter, by default EJS is using %
     * @param {string} wd current working directory
     * @param options
     * @param {IContext} context
     * @param {boolean} [maskSecrets] if true - all secrets will be masked
     * @param {IDelegatedParameters} parameters delegated parameters
     * @return {any}
     */
    resolveOptionsWithNoHandlerCheck(
        delimiter: string,
        wd: string,
        options: any,
        context: IContext,
        maskSecrets: boolean,
        parameters: IDelegatedParameters
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
            const yaml = this.resolveTemplate(delimiter, wd, tpl, context, parameters);
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
     * @param {IDelegatedParameters} parameters delegated parameters
     * @returns {Promise<any>}
     */
    resolveOptions(wd: string, handler: ActionHandler, options: any, context: IContext, maskSecrets: boolean, parameters: IDelegatedParameters): any {
        if (handler.getMetadata().skipTemplateProcessing) {
            return options;
        }

        return this.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, wd, options, context, maskSecrets, parameters);
    }
}
