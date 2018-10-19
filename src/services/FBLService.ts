import {Inject, Service} from 'typedi';
import {IContext, IFlow, IPlugin, IReporter} from '../interfaces';
import * as Joi from 'joi';
import {FlowService} from './index';
import {ActionSnapshot} from '../models';
import {ActionHandlersRegistry} from './ActionHandlersRegistry';
import * as semver from 'semver';
import {IMetadata} from '../interfaces/IMetadata';
import {TemplateUtilitiesRegistry} from './TemplateUtilitiesRegistry';
import {which} from 'shelljs';
import {boolean} from 'joi';

const requireg = require('requireg');

const fblVersion: string = require('../../../package.json').version;

const joiStepSchemaExt = Joi.extend({
    name: 'FBLStep',
    base: Joi.object().min(1).required(),
    language: {
        fields: ''
    },
    rules: [
        {
            name: 'fields',
            validate (params, value, state, options) {
                const keys = Object.keys(value);

                let nonAnnotationKeys = 0;
                for (const key of keys) {
                    if (!key.startsWith(FBLService.METADATA_PREFIX)) {
                        nonAnnotationKeys++;
                    }
                }

                if (nonAnnotationKeys !== 1) {
                    return this.createError(`Found ${nonAnnotationKeys} non-annotation fields, but only one is required.`, {}, state, options);
                }

                return value;
            }
        }
    ]
});

@Service()
export class FBLService {
    private plugins: {[name: string]: IPlugin} = {};

    public static METADATA_PREFIX = '$';

    public static get STEP_SCHEMA() {
        return joiStepSchemaExt.FBLStep().fields();
    }

    private static validationSchema = Joi.object({
        version: Joi.string()
            .regex(/\d+\.\d+\.\d+/i)
            .required(),

        requires: Joi.object({
            fbl: Joi.string().min(1),
            plugins: Joi.object().min(1).pattern(
                /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/,
                        Joi.string().min(1)
            ),
            applications: Joi.array().items(Joi.string().min(1)).min(1)
        }),

        description: Joi.string(),

        pipeline: FBLService.STEP_SCHEMA
    }).options({ abortEarly: true });

    private reporters: {[name: string]: IReporter} = {};

    // if plugin dependencies are not satisfied instead of throwing error log statements will be printed only
    public allowUnsafePlugins = false;

    // if flow requirements are not satisfied instead of throwing error log statements will be printed only
    public allowUnsafeFlows = false;

    @Inject(() => FlowService)
    flowService: FlowService;

    @Inject(() => ActionHandlersRegistry)
    actionHandlersRegistry: ActionHandlersRegistry;

    @Inject(() => TemplateUtilitiesRegistry)
    templateUtilityRegistry: TemplateUtilitiesRegistry;

    /**
     * Extract idOrAlias from step object
     * @param {object} step
     * @return {string}
     */
    static extractIdOrAlias(step: {[key: string]: any}): string {
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
    static extractMetadata(step: {[key: string]: any}): IMetadata {
        const result: {[key: string]: any} = {};
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

        if (plugin.actionHandlers) {
            plugin.actionHandlers.forEach(actionHander => {
                this.actionHandlersRegistry.register(actionHander);
            });
        }

        if (plugin.reporters) {
            plugin.reporters.forEach(reporter => {
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
        plugins.forEach(plugin => {
           this.registerPlugin(plugin);
        });
    }

    /**
     * Validate plugin to be registered and try to auto load if not
     * @param {string} pluginName
     * @param {string} pluginExpectedVersion
     * @param {string[]} errors
     * @param {boolean} dryRun if true plugin just be verified, not actually registered
     */
    validateRequiredPlugin(pluginName: string, pluginExpectedVersion: string, errors: string[], dryRun: boolean) {
        let plugin = this.plugins[pluginName];

        if (!plugin) {
            try {
                plugin = requireg(pluginName);
                this.validatePlugin(plugin);

                /* istanbul ignore else */
                if (!dryRun) {
                    this.registerPlugin(plugin);
                }
            } catch (e) {
                errors.push(`Required plugin ${pluginName.red} is not registered. Error: ${e.message}`);
            }
        }

        if (plugin && !semver.satisfies(plugin.version, pluginExpectedVersion)) {
            errors.push(`Actual plugin ${pluginName.red} version ${plugin.version.red} doesn't satisfy required ${pluginExpectedVersion.red}`);
        }
    }

    /**
     * Validate plugin
     * @param {IPlugin} plugin
     */
    validatePlugin(plugin: IPlugin): void {
        const errors: string[] = [];

        if (!semver.satisfies(fblVersion, plugin.requires.fbl)) {
            errors.push(`Plugin ${plugin.name.red} is not compatible with current fbl version (${fblVersion.red})`);
        }

        if (plugin.requires.plugins) {
            const dryRun = !this.allowUnsafePlugins && errors.length > 0;

            for (const dependencyPluginName of Object.keys(plugin.requires.plugins)) {
                const dependencyPluginRequiredVersion = plugin.requires.plugins[dependencyPluginName];

                this.validateRequiredPlugin(
                    dependencyPluginName,
                    dependencyPluginRequiredVersion,
                    errors,
                    dryRun
                );
            }
        }

        if (plugin.requires.applications) {
            for (const application of plugin.requires.applications) {
                /* istanbul ignore else */
                if (!which(application)) {
                    errors.push(`Application ${application.red} required by plugin ${plugin.name.red} not found, make sure it is installed and its location presents in the PATH environment variable`);
                }
            }
        }

        if (errors.length) {
            if (this.allowUnsafePlugins) {
                errors.forEach(err => console.error(err));
            } else {
                throw new Error(errors.join('\n'));
            }
        }
    }

    /**
     * Validate plugins to be compatible
     */
    validatePlugins(): void {
        for (const name of Object.keys(this.plugins)) {
            this.validatePlugin(this.plugins[name]);
        }
    }

    /**
     * Validate flow requirements
     * @param {IFlow} flow
     * @return {Promise<void>}
     */
    async validateFlowRequirements(flow: IFlow): Promise<void> {
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

                    this.validateRequiredPlugin(
                        pluginName,
                        pluginExpectedVersion,
                        errors,
                        dryRun
                    );
                }
            }

            if (flow.requires.applications) {
                for (const application of flow.requires.applications) {
                    if (!which(application)) {
                        errors.push(`Application ${application.red} required by flow not found, make sure it is installed and its location presents in the PATH environment variable`);
                    }
                }
            }
        }

        if (errors.length) {
            if (this.allowUnsafeFlows) {
                errors.forEach(err => console.error(err));
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
     * @returns {Promise<ActionSnapshot>}
     */
    async execute(wd: string, flow: IFlow, context: IContext): Promise<ActionSnapshot> {
        const result = Joi.validate(flow, FBLService.validationSchema);
        if (result.error) {
            throw new Error(result.error.details.map(d => d.message).join('\n'));
        }

        await this.validateFlowRequirements(flow);

        const idOrAlias = FBLService.extractIdOrAlias(flow.pipeline);
        let metadata = FBLService.extractMetadata(flow.pipeline);
        metadata = this.flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, wd, metadata, context, false);

        const options = flow.pipeline[idOrAlias];

        return await this.flowService.executeAction(wd, idOrAlias, metadata, options, context);
    }
}
