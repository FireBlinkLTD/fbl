import Container, { Service } from 'typedi';
import { IContext, IDelegatedParameters, IFlow, IPlugin, IReporter } from '../interfaces';
import * as Joi from 'joi';
import { FlowService } from './index';
import { ActionSnapshot } from '../models';
import { ActionHandlersRegistry } from './ActionHandlersRegistry';
import * as semver from 'semver';
import { IMetadata } from '../interfaces/IMetadata';
import { TemplateUtilitiesRegistry } from './TemplateUtilitiesRegistry';
import { resolve } from 'path';
import { FSUtil } from '../utils';
import { FBL_FLOW_SCHEMA } from '../schemas';

const commandExists = require('command-exists');

const requireg = require('requireg');

const fblVersion: string = require(process.env.FBL_ENV === 'test' ? '../../package.json' : '../../../package.json')
    .version;

@Service()
export class FBLService {
    private plugins: { [name: string]: IPlugin } = {};
    private processedPlugins: { [name: string]: string } = {};

    public static METADATA_PREFIX = '$';

    private reporters: { [name: string]: IReporter } = {};

    // if plugin dependencies are not satisfied instead of throwing error log statements will be printed only
    public allowUnsafePlugins = false;

    // if flow requirements are not satisfied instead of throwing error log statements will be printed only
    public allowUnsafeFlows = false;

    get flowService(): FlowService {
        return Container.get(FlowService);
    }

    get actionHandlersRegistry(): ActionHandlersRegistry {
        return Container.get(ActionHandlersRegistry);
    }

    get templateUtilityRegistry(): TemplateUtilitiesRegistry {
        return Container.get(TemplateUtilitiesRegistry);
    }

    /**
     * Extract idOrAlias from step object
     * @param {object} step
     * @return {string}
     */
    static extractIdOrAlias(step: { [key: string]: any }): string {
        const keys = Object.keys(step);

        for (const key of keys) {
            if (!key.startsWith(FBLService.METADATA_PREFIX)) {
                return key;
            }
        }

        // this error should potentially never be thrown as all steps should be pre-validated
        throw new Error(`Unable to extract id or alias from keys: ${keys.join(', ')}`);
    }

    /**
     * Extract step metadata
     * @param {object} step
     * @return {IMetadata}
     */
    static extractMetadata(step: { [key: string]: any }): IMetadata {
        const result: { [key: string]: any } = {};
        const keys = Object.keys(step);

        for (const key of keys) {
            if (key.startsWith(FBLService.METADATA_PREFIX)) {
                result[key] = step[key];
            }
        }

        return result;
    }

    /**
     * Get reporter by name
     * @param {string} name
     * @return {IReporter | undefined}
     */
    getReporter(name: string): IReporter | undefined {
        return this.reporters[name];
    }

    /**
     * Find plugin by its name
     * @param {string} name
     * @return {IPlugin | undefined}
     */
    getPlugin(name: string): IPlugin | undefined {
        return this.plugins[name];
    }

    /**
     * Register single plugin
     * @param {IPlugin} plugin
     */
    registerPlugin(plugin: IPlugin): void {
        this.plugins[plugin.name] = plugin;
        this.processedPlugins[plugin.name] = plugin.version;

        if (plugin.actionHandlers) {
            plugin.actionHandlers.forEach((actionHandler) => {
                this.actionHandlersRegistry.register(actionHandler, plugin);
            });
        }

        if (plugin.reporters) {
            plugin.reporters.forEach((reporter) => {
                this.reporters[reporter.getName()] = reporter;
            });
        }

        if (plugin.templateUtils) {
            this.templateUtilityRegistry.register(...plugin.templateUtils);
        }
    }

    /**
     * Register plugins
     * @param {IPlugin[]} plugins
     */
    registerPlugins(plugins: IPlugin[]): void {
        plugins.forEach((plugin) => {
            this.registerPlugin(plugin);
        });
    }

    /**
     * Try to require plugin, just return null if not found. Doesn't throw exceptions
     * @param {string} pluginNameOrPath
     * @param {boolean} name
     * @return {IPlugin | null}
     */
    static async requirePluginSafe(pluginNameOrPath: string, name: boolean): Promise<IPlugin | null> {
        let plugin: IPlugin | null = null;
        let exists = false;
        try {
            if (name) {
                plugin = requireg(pluginNameOrPath);
            } else {
                exists = await FSUtil.exists(pluginNameOrPath);
                if (exists) {
                    plugin = require(pluginNameOrPath);
                } else {
                    exists = await FSUtil.exists(pluginNameOrPath + '.js');
                    if (exists) {
                        plugin = require(pluginNameOrPath);
                    }
                }
            }
        } catch (e) {
            if (exists) {
                throw e;
            }

            // ignore this
        }

        return plugin;
    }

    /**
     * Require plugin
     * @param {string} pluginName
     * @param {string} wd
     * @return {IPlugin | null}
     */
    static async requirePlugin(pluginName: string, wd: string): Promise<IPlugin> {
        let plugin = await FBLService.requirePluginSafe(pluginName, true);

        let childDir: string | null = null;
        if (!plugin) {
            while (!plugin && (!childDir || childDir !== wd)) {
                // search in node_modules dir
                plugin = await FBLService.requirePluginSafe(resolve(wd, 'node_modules', pluginName), false);

                /* istanbul ignore else */
                if (!plugin) {
                    // search in directory with plugin name (useful when referencing sources)
                    plugin = await FBLService.requirePluginSafe(resolve(wd, pluginName), false);
                }

                childDir = wd;
                wd = resolve(wd, '..');
            }
        }

        if (!plugin) {
            throw new Error(`Unable to locate plugin ${pluginName}`);
        }

        return plugin;
    }

    /**
     * Validate plugin to be registered and try to auto load if not
     * @param {string} pluginName
     * @param {string} pluginExpectedVersion
     * @param {string[]} errors
     * @param {string} wd working directory
     * @param {boolean} dryRun if true plugin just be verified, not actually registered
     */
    async validateRequiredPlugin(
        pluginName: string,
        pluginExpectedVersion: string,
        errors: string[],
        wd: string,
        dryRun: boolean,
    ): Promise<void> {
        let version = this.processedPlugins[pluginName];

        if (!version) {
            try {
                const plugin = await FBLService.requirePlugin(pluginName, wd);

                version = plugin.version;
                this.processedPlugins[plugin.name] = plugin.version;
                this.processedPlugins[pluginName] = plugin.version;

                await this.validatePlugin(plugin, wd);

                /* istanbul ignore else */
                if (!dryRun) {
                    this.registerPlugin(plugin);
                }
            } catch (e) {
                errors.push(`Required plugin ${pluginName.red} is not registered. Error: ${e.message}`);
            }
        }

        if (version && !semver.satisfies(version, pluginExpectedVersion)) {
            errors.push(
                `Actual plugin ${pluginName.red} version ${version.red} doesn't satisfy required ${pluginExpectedVersion.red}`,
            );
        }
    }

    /**
     * Validate plugin
     * @param {IPlugin} plugin
     * @param {string} wd
     */
    async validatePlugin(plugin: IPlugin, wd: string): Promise<void> {
        const errors: string[] = [];

        if (!semver.satisfies(fblVersion, plugin.requires.fbl)) {
            errors.push(`Plugin ${plugin.name.red} is not compatible with current fbl version (${fblVersion.red})`);
        }

        if (plugin.requires.plugins) {
            const dryRun = !this.allowUnsafePlugins && errors.length > 0;

            for (const dependencyPluginName of Object.keys(plugin.requires.plugins)) {
                const dependencyPluginRequiredVersion = plugin.requires.plugins[dependencyPluginName];

                await this.validateRequiredPlugin(
                    dependencyPluginName,
                    dependencyPluginRequiredVersion,
                    errors,
                    wd,
                    dryRun,
                );
            }
        }

        if (plugin.requires.applications) {
            for (const application of plugin.requires.applications) {
                let exists = false;
                try {
                    exists = await commandExists(application);
                } catch (e) {
                    exists = false;
                }

                if (!exists) {
                    errors.push(
                        `Application ${application.red} required by plugin ${plugin.name.red} not found, make sure it is installed and its location presents in the PATH environment variable`,
                    );
                }
            }
        }

        if (errors.length) {
            if (this.allowUnsafePlugins) {
                errors.forEach((err) => console.error(err));
            } else {
                throw new Error(errors.join('\n'));
            }
        }
    }

    /**
     * Validate plugins to be compatible
     * @param {string} wd
     */
    async validatePlugins(wd: string): Promise<void> {
        for (const name of Object.keys(this.plugins)) {
            await this.validatePlugin(this.plugins[name], wd);
        }
    }

    /**
     * Validate flow requirements
     * @param {IFlow} flow
     * @param {string} wd
     * @return {Promise<void>}
     */
    async validateFlowRequirements(flow: IFlow, wd: string): Promise<void> {
        const errors: string[] = [];
        if (flow.requires) {
            if (flow.requires.fbl) {
                if (!semver.satisfies(fblVersion, flow.requires.fbl)) {
                    errors.push(`Flow is not compatible with current fbl version (${fblVersion.red})`);
                }
            }

            if (flow.requires.plugins) {
                const dryRun = !this.allowUnsafeFlows && errors.length > 0;

                for (const pluginName of Object.keys(flow.requires.plugins)) {
                    const pluginExpectedVersion = flow.requires.plugins[pluginName];

                    await this.validateRequiredPlugin(pluginName, pluginExpectedVersion, errors, wd, dryRun);
                }
            }

            if (flow.requires.applications) {
                for (const application of flow.requires.applications) {
                    let exists = false;
                    try {
                        exists = await commandExists(application);
                    } catch (e) {
                        exists = false;
                    }

                    if (!exists) {
                        errors.push(
                            `Application ${application.red} required by flow not found, make sure it is installed and its location presents in the PATH environment variable`,
                        );
                    }
                }
            }
        }

        if (errors.length) {
            if (this.allowUnsafeFlows) {
                errors.forEach((err) => console.error(err));
            } else {
                throw new Error(errors.join('\n'));
            }
        }
    }

    /**
     * Execute flow
     * @param {string} wd Working Directory
     * @param {IFlow} flow,
     * @param {IContext} context
     * @param {IDelegatedParameters} parameters
     * @returns {Promise<ActionSnapshot>}
     */
    async execute(
        source: string,
        wd: string,
        flow: IFlow,
        context: IContext,
        parameters: IDelegatedParameters,
    ): Promise<ActionSnapshot> {
        try {
            Joi.assert(flow, FBL_FLOW_SCHEMA);
        } catch (e) {
            throw new Error((<Joi.ValidationError>e).details.map((d) => d.message).join('\n'));
        }

        await this.validateFlowRequirements(flow, wd);

        return await this.flowService.executeAction(source, wd, flow.pipeline, context, parameters);
    }
}
