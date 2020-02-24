import { ActionHandlersRegistry } from './ActionHandlersRegistry';
import { IContext, IDelegatedParameters, IFlow, IFlowLocationOptions } from '../interfaces';
import { safeLoad, dump } from 'js-yaml';
import * as ejs from 'ejs';
import { ActionHandler, ActionSnapshot, EnabledActionSnapshot } from '../models';
import Container, { Service } from 'typedi';
import { ContextUtil, FSUtil } from '../utils';
import { TemplateUtilitiesRegistry } from './TemplateUtilitiesRegistry';
import { dirname, join, resolve } from 'path';
import { x } from 'tar';
import { createWriteStream, readdir, unlink } from 'fs';
import { promisify } from 'util';
import got from 'got';
import { TempPathsRegistry } from './TempPathsRegistry';
import { homedir } from 'os';
import { LogService } from './LogService';
import { isMissing } from 'object-collider';
import { FBLService } from './FBLService';

const ejsLint = require('ejs-lint');
const uuidv5 = require('uuid/v5');

@Service()
export class FlowService {
    private index = 0;

    public static MASKED = '{MASKED}';

    private flowPathCache: { [key: string]: string };
    private flowResolvers: { [key: string]: Promise<string> };

    constructor() {
        this.flowPathCache = {};
        this.flowResolvers = {};
    }

    /**
     * Get FBL home directory
     */
    static getHomeDir(): string {
        return process.env.FBL_HOME || resolve(homedir(), '.fbl');
    }

    /**
     * Turn to true to capture snapshots
     * @type {boolean}
     */
    public debug = false;

    get actionHandlersRegistry(): ActionHandlersRegistry {
        return Container.get(ActionHandlersRegistry);
    }

    get templateUtilityRegistry(): TemplateUtilitiesRegistry {
        return Container.get(TemplateUtilitiesRegistry);
    }

    get tempPathsRegistry(): TempPathsRegistry {
        return Container.get(TempPathsRegistry);
    }

    get logService(): LogService {
        return Container.get(LogService);
    }

    /**
     * Execute action
     * @param {string} wd Working Directory
     * @param action
     * @param {IContext} context
     * @param {IDelegatedParameters} parameters
     * @param {ActionSnapshot} parentSnapshot
     * @returns {Promise<void>}
     */
    async executeAction(
        source: string,
        wd: string,
        action: Record<string, any> | string,
        context: IContext,
        parameters: IDelegatedParameters,
        parentSnapshot?: ActionSnapshot,
    ): Promise<ActionSnapshot> {
        let options: any;
        let idOrAlias: string;
        let metadata: Record<string, any>;

        if (typeof action !== 'string') {
            if (!parentSnapshot) {
                parentSnapshot = new ActionSnapshot(source, 'void', {}, wd, 0, {});
            }

            idOrAlias = FBLService.extractIdOrAlias(action);
            options = action[idOrAlias];

            metadata = FBLService.extractMetadata(action);
            metadata = await this.resolveOptionsWithNoHandlerCheck(
                context.ejsTemplateDelimiters.local,
                metadata,
                context,
                parentSnapshot,
                parameters,
                false,
            );
        } else {
            idOrAlias = action;
            metadata = {};
        }

        if (metadata && metadata.$parameters) {
            ContextUtil.assign(parameters.parameters, '$', metadata.$parameters, false);
        }

        const idx = ++this.index;
        this.logService.info(
            ` -> [${idx}] [${source}] [${(metadata && metadata.$title) || idOrAlias}]`.green + ' Processing.',
        );

        let snapshot: ActionSnapshot;
        if (this.debug) {
            snapshot = new EnabledActionSnapshot(source, idOrAlias, metadata, wd, idx, parameters);
        } else {
            snapshot = new ActionSnapshot(source, idOrAlias, metadata, wd, idx, parameters);
        }

        try {
            let handler = this.actionHandlersRegistry.find(idOrAlias);
            if (!handler) {
                handler = context.dynamicActionHandlers.find(idOrAlias);
            }

            if (!handler) {
                throw new Error(`Unable to find action handler for: ${idOrAlias}`);
            }

            const alternativeWD = handler.getWorkingDirectory();
            if (alternativeWD) {
                snapshot.wd = alternativeWD;
            }

            snapshot.setInitialContextState(context);
            snapshot.setActionHandlerId(handler.getMetadata().id);

            if (!handler.getMetadata().considerOptionsAsSecrets) {
                snapshot.setOptions(options);
                // register options twice to see what's actually has been changed (only when changes applied)
                const resolvedOptions = await this.resolveOptions(
                    handler,
                    options,
                    context,
                    snapshot,
                    parameters,
                    true,
                );
                if (JSON.stringify(options) !== JSON.stringify(resolvedOptions)) {
                    snapshot.setOptions(resolvedOptions);
                }
            } else {
                snapshot.setOptions(FlowService.MASKED);
            }

            // resolve without masking
            options = await this.resolveOptions(handler, options, context, snapshot, parameters, false);

            const processor = handler.getProcessor(options, context, snapshot, parameters);

            await processor.validate();
            snapshot.validated();

            const shouldExecute = await processor.isShouldExecute();
            if (shouldExecute) {
                snapshot.start();
                await processor.execute();
                snapshot.success();

                if (snapshot.successful) {
                    this.logService.info(
                        ` <- [${idx}] [${source}] [${(metadata && metadata.$title) || idOrAlias}]`.blue +
                            ' Completed successfully withing ' +
                            snapshot.getHumanReadableDuration().blue,
                    );
                } else {
                    this.logService.info(
                        ` <- [${idx}] [${source}] [${(metadata && metadata.$title) || idOrAlias}]`.yellow +
                            ' Marked as failed. Took ' +
                            snapshot.getHumanReadableDuration().yellow,
                    );
                }
            } else {
                this.logService.info(
                    ` <- [${idx}] [${source}] [${(metadata && metadata.$title) || idOrAlias}]`.yellow + ' Skipped',
                );
                snapshot.skipped();
            }
        } catch (e) {
            this.logService.error(
                ` <- [${idx}] [${source}] [${(metadata && metadata.$title) || idOrAlias}]`.red +
                    ` Failed with: ${e.toString().red}`,
            );
            snapshot.failure(e);
        }

        return snapshot;
    }

    /**
     * Get cached tarball pass by given url
     * @param url
     */
    static async getCachedTarballPathForURL(url: string): Promise<string> {
        const cacheDir = resolve(FlowService.getHomeDir(), 'cache');
        await FSUtil.mkdirp(cacheDir);

        return resolve(cacheDir, uuidv5(url, uuidv5.URL) + '.tar.gz');
    }

    /**
     * Download tarball into temp location
     * @param {IFlowLocationOptions} location
     * @param {number} [redirectCount]
     * @return {Promise<string>} temp tarball location
     */
    private async downloadTarball(location: IFlowLocationOptions, redirectCount = 0): Promise<string> {
        let tarballFile;
        if (location.cache) {
            tarballFile = await FlowService.getCachedTarballPathForURL(location.path);

            const exists = await FSUtil.exists(tarballFile);
            if (exists) {
                this.logService.info(' -> Found cached tarball for remote URL: '.green + location.path);

                return tarballFile;
            }
        } else {
            tarballFile = await this.tempPathsRegistry.createTempFile(false, '.tar.gz');
        }

        this.logService.info(' -> Downloading tarball from remote URL: '.green + location.path + ' to ' + tarballFile);
        const ws = createWriteStream(tarballFile);
        try {
            await new Promise((res, rej) => {
                const stream = got.stream(location.path, {
                    isStream: true,
                    timeout: 120 * 1000,
                    headers: location.http && location.http.headers,
                });

                stream.pipe(ws);

                ws.on('finish', res);
                stream.on('error', rej);
            });
        } catch (e) {
            const exists = await FSUtil.exists(tarballFile);
            /* istanbul ignore else */
            if (exists) {
                await promisify(unlink)(tarballFile);
            }
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
        this.logService.info(' -> Extracting tarball at path: '.green + path);
        const tarball = path;
        const result = await this.tempPathsRegistry.createTempDir();

        await x({
            file: tarball,
            C: result,
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
     * @param {ActionSnapshot} snapshot
     * @param {IDelegatedParameters} parameters
     * @returns {Promise<IFlow>}
     */
    async readFlowFromFile(
        location: IFlowLocationOptions,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<{ flow: IFlow; wd: string }> {
        const absolutePath = await this.resolveFlow(location);

        this.logService.info(` -> Reading flow file: `.green + absolutePath);
        let content = await FSUtil.readTextFile(absolutePath);

        content = await this.resolveTemplate(
            context.ejsTemplateDelimiters.global,
            content,
            context,
            snapshot,
            parameters,
        );

        let flow;
        try {
            flow = safeLoad(content) as IFlow;
        } catch (e) {
            this.logService.error(
                ` -> Reading flow failed from file: `.red + absolutePath + ' Error: ' + e.message.red,
            );
            this.logService.error(content.gray);
            throw e;
        }

        return { flow, wd: dirname(absolutePath) };
    }

    /**
     * Resolve template
     * @param {string} delimiter EJS template delimiter
     * @param {string} tpl template to resolve
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @param {IDelegatedParameters} parameters
     * @param [extraVariables] additional varialbes to be presented in EJS data
     * @return {string}
     */
    async resolveTemplate(
        delimiter: string,
        tpl: string,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
        extraVariables?: { [key: string]: any },
        wd?: string,
    ): Promise<string> {
        // validate template
        ejsLint(tpl, { delimiter });

        const data: any = {
            $: this.templateUtilityRegistry.generateUtilities(context, snapshot, parameters, wd || snapshot.wd),
            env: process.env,
            ...parameters,
            ...context,
        };

        if (extraVariables) {
            Object.assign(data, extraVariables);
        }

        const options = <ejs.Options>{
            delimiter,
            escape: (value: any) => {
                if (typeof value === 'number' || typeof value === 'boolean') {
                    return value.toString();
                }

                if (typeof value === 'string') {
                    return JSON.stringify(value);
                }

                if (isMissing(value)) {
                    return 'null';
                }

                throw Error(`Value could not be escaped. Use $ref:path to pass value by reference.`);
            },
            async: true,
        };

        const result = await ejs.render(tpl, data, options);

        return result;
    }

    /**
     * Resolve options with no handler check
     * @param {string} delimiter - EJS template delimiter, by default EJS is using %
     * @param options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @param {IDelegatedParameters} parameters delegated parameters
     * @param {boolean} maskSecrets if true - all secrets will be masked
     * @return {any}
     */
    async resolveOptionsWithNoHandlerCheck(
        delimiter: string,
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
        maskSecrets: boolean,
    ): Promise<any> {
        if (!options) {
            return options;
        }

        if (maskSecrets && context.secrets && Object.keys(context.secrets).length) {
            // make a copy of the options object first
            let json = JSON.stringify(options);

            const pattern = `<${delimiter}[^${delimiter}>|\\w]*[^\\w]+(secrets[^\\w])[^${delimiter}>]*${delimiter}>`;
            const regex = new RegExp(pattern, 'g');
            json = json.replace(regex, FlowService.MASKED);
            options = JSON.parse(json);
        }

        let tpl = dump(options);

        // fix template after dump
        // while in yaml following string is fully valid '<%- ctx[''name''] %>'
        // for EJS it is broken due to quotes escape
        const lines: string[] = [];
        const ejsTemplateRegEx = new RegExp(`<${delimiter}([^${delimiter}>]*)${delimiter}>`, 'g');
        const doubleQuotesRegEx = /''/g;
        tpl.split('\n').forEach(line => {
            if (line.indexOf("''") !== -1) {
                // we only want to replace '' to ' inside the EJS template
                line = line.replace(ejsTemplateRegEx, function(match, g1): string {
                    return `<${delimiter}${g1.replace(doubleQuotesRegEx, "'")}${delimiter}>`;
                });
            }

            lines.push(line);
        });

        tpl = lines.join('\n');
        const yaml = await this.resolveTemplate(delimiter, tpl, context, snapshot, parameters);
        options = safeLoad(yaml);

        // resolve references
        options = ContextUtil.resolveReferences(options, context, parameters);

        return options;
    }

    /**
     * Resolve options for handler
     * @param {ActionHandler} handler
     * @param options
     * @param {IContext} context
     * @param {IDelegatedParameters} parameters delegated parameters
     * @param {boolean} maskSecrets if true - all secrets will be masked
     * @returns {Promise<any>}
     */
    async resolveOptions(
        handler: ActionHandler,
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
        maskSecrets: boolean,
    ): Promise<any> {
        if (handler.getMetadata().skipTemplateProcessing) {
            return options;
        }

        return await this.resolveOptionsWithNoHandlerCheck(
            context.ejsTemplateDelimiters.local,
            options,
            context,
            snapshot,
            parameters,
            maskSecrets,
        );
    }
}
