import {Inject, Service} from 'typedi';
import {IContext, IFlow, IPlugin, IReporter} from '../interfaces';
import * as Joi from 'joi';
import {FlowService} from './index';
import {ActionSnapshot} from '../models';
import {ActionHandlersRegistry} from './ActionHandlersRegistry';
import * as semver from 'semver';
import {IMetadata} from '../interfaces/IMetadata';

const fblVersion: string = require('../../../package.json').version;

const METADATA_PREFIX = '$';

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
                    if (!key.startsWith(METADATA_PREFIX)) {
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

    public static STEP_SCHEMA = joiStepSchemaExt.FBLStep().fields();

    private static validationSchema = Joi.object({
        version: Joi.string()
            .regex(/\d+\.\d+\.\d+/gi)
            .required(),

        description: Joi.string(),

        pipeline: FBLService.STEP_SCHEMA
    }).options({ abortEarly: true });

    private reporters: {[name: string]: IReporter} = {};

    @Inject(() => FlowService)
    flowService: FlowService;

    @Inject(() => ActionHandlersRegistry)
    actionHandlersRegistry: ActionHandlersRegistry;

    /**
     * Extract idOrAlias from step object
     * @param {{[key: string]: any}} step
     * @return {{[key: string]: any}}
     */
    static extractIdOrAlias(step: {[key: string]: any}): string {
        const keys = Object.keys(step);

        for (const key of keys) {
            if (!key.startsWith(METADATA_PREFIX)) {
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
            if (key.startsWith(METADATA_PREFIX)) {
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
                    if (actionHander.getMetadata().aliases) {
                        for (const alias of actionHander.getMetadata().aliases) {
                            if (alias.startsWith(METADATA_PREFIX)) {
                                throw new Error(`Unable to register plugin ${plugin.name}. Action handler alias "${alias}" could not start with ${METADATA_PREFIX}`);
                            }
                        }
                    }

                    if (actionHander.getMetadata().id.startsWith(METADATA_PREFIX)) {
                        throw new Error(`Unable to register plugin ${plugin.name}. Action handler ID "${actionHander.getMetadata().id}" could not start with ${METADATA_PREFIX}`);
                    }

                    this.actionHandlersRegistry.register(actionHander);
                });
            }

            if (plugin.reporters) {
                plugin.reporters.forEach(reporter => {
                    this.reporters[reporter.getName()] = reporter;
                });
            }
        });
    }

    /**
     * Validate plugins to be compatible
     * @param {boolean} unsafe if provided instead of rising an error - warning will be logged.
     */
    validatePlugins(unsafe?: boolean): void {
        for (const name of Object.keys(this.plugins)) {
            const plugin = this.plugins[name];

            if (!semver.satisfies(fblVersion, plugin.requires.fbl)) {
                if (unsafe) {
                    console.log(`${plugin.name}`.red + ' plugin is not compatible with current fbl version (' + `${fblVersion}`.red + ')');
                } else {
                    throw new Error(`${plugin.name} plugin is not compatible with current fbl version (${fblVersion})`);
                }
            }

            if (plugin.requires.plugins) {
                for (const dependencyPluginName of Object.keys(plugin.requires.plugins)) {
                    const dependencyPluginRequiredVersion = plugin.requires.plugins[dependencyPluginName];
                    const dependencyPlugin = this.plugins[dependencyPluginName];

                    if (!dependencyPlugin) {
                        if (unsafe) {
                            console.log(`${plugin.name}`.red + ' plugin requires missing plugin ' + `${dependencyPluginName}@${dependencyPluginRequiredVersion}`.red);
                        } else {
                            throw new Error(`${plugin.name} plugin requires missing plugin ${dependencyPluginName}@${dependencyPluginRequiredVersion}`);
                        }
                    } else {
                        if (!semver.satisfies(dependencyPlugin.version, dependencyPluginRequiredVersion)) {
                            if (unsafe) {
                                console.log(`${plugin.name}`.red + ' plugin is not compatible with plugin ' + `${dependencyPluginName}@${dependencyPlugin.version}`.red);
                            } else {
                                throw new Error(`${plugin.name} plugin is not compatible with plugin ${dependencyPluginName}@${dependencyPlugin.version}`);
                            }
                        }
                    }
                }
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

        const idOrAlias = FBLService.extractIdOrAlias(flow.pipeline);
        let metadata = FBLService.extractMetadata(flow.pipeline);
        metadata = this.flowService.resolveOptionsWithNoHandlerCheck(wd, metadata, context, false);

        const options = flow.pipeline[idOrAlias];

        return await this.flowService.executeAction(wd, idOrAlias, metadata, options, context);
    }
}
