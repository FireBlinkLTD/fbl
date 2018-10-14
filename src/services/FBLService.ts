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
            plugins: Joi.array().items(
                Joi.string().regex(/[^@]+@[^@]+/i).min(1)
            ).min(1),
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
     * @param {{[key: string]: any}} step
     * @return {{[key: string]: any}}
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
     * @param {{[key: string]: any}} step
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
     * Register plugins
     * @param {IPlugin[]} plugins
     */
    registerPlugins(plugins: IPlugin[]): void {
        plugins.forEach(plugin => {
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
        });
    }

    /**
     * Validate plugins to be compatible
     */
    validatePlugins(): void {
        for (const name of Object.keys(this.plugins)) {
            const plugin = this.plugins[name];

            if (!semver.satisfies(fblVersion, plugin.requires.fbl)) {
                if (this.allowUnsafePlugins) {
                    console.error(`${plugin.name}`.red + ' plugin is not compatible with current fbl version (' + `${fblVersion}`.red + ')');
                } else {
                    throw new Error(`${plugin.name} plugin is not compatible with current fbl version (${fblVersion})`);
                }
            }

            if (plugin.requires.plugins) {
                for (const dependencyPluginName of Object.keys(plugin.requires.plugins)) {
                    const dependencyPluginRequiredVersion = plugin.requires.plugins[dependencyPluginName];
                    const dependencyPlugin = this.plugins[dependencyPluginName];

                    if (!dependencyPlugin) {
                        if (this.allowUnsafePlugins) {
                            console.error(`${plugin.name}`.red + ' plugin requires missing plugin ' + `${dependencyPluginName}@${dependencyPluginRequiredVersion}`.red);
                        } else {
                            throw new Error(`${plugin.name} plugin requires missing plugin ${dependencyPluginName}@${dependencyPluginRequiredVersion}`);
                        }
                    } else {
                        if (!semver.satisfies(dependencyPlugin.version, dependencyPluginRequiredVersion)) {
                            if (this.allowUnsafePlugins) {
                                console.error(`${plugin.name}`.red + ' plugin is not compatible with plugin ' + `${dependencyPluginName}@${dependencyPlugin.version}`.red);
                            } else {
                                throw new Error(`${plugin.name} plugin is not compatible with plugin ${dependencyPluginName}@${dependencyPlugin.version}`);
                            }
                        }
                    }
                }
            }
        }
    }

    async validateFlowRequirements(flow: IFlow): Promise<void> {
        const errors: string[] = [];
        if (flow.requires) {
            if (flow.requires.fbl) {
                if (!semver.satisfies(fblVersion, flow.requires.fbl)) {
                    errors.push(`actual fbl version ${fblVersion.green} doesn't satisfy required ${flow.requires.fbl.green}`);
                }
            }

            if (flow.requires.plugins) {
                for (const pluginNameVersion of flow.requires.plugins) {
                    const chunks = pluginNameVersion.split('@');

                    const plugin = this.plugins[chunks[0]];
                    if (!plugin) {
                        errors.push(`required plugin ${chunks[0].green} is not registered`);
                    } else {
                        if (!semver.satisfies(plugin.version, chunks[1])) {
                            errors.push(`actual plugin ${chunks[0].green} version ${plugin.version.green} doesn't satisfy required ${chunks[1].green}`);
                        }
                    }
                }
            }

            if (flow.requires.applications) {
                for (const application of flow.requires.applications) {
                    if (!which(application)) {
                        errors.push(`application ${application.green} not found, make sure it is installed and its location presents in the PATH environment variable`);
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
        await this.validateFlowRequirements(flow);

        const result = Joi.validate(flow, FBLService.validationSchema);
        if (result.error) {
            throw new Error(result.error.details.map(d => d.message).join('\n'));
        }

        const idOrAlias = FBLService.extractIdOrAlias(flow.pipeline);
        let metadata = FBLService.extractMetadata(flow.pipeline);
        metadata = this.flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, wd, metadata, context, false);

        const options = flow.pipeline[idOrAlias];

        return await this.flowService.executeAction(wd, idOrAlias, metadata, options, context);
    }
}
