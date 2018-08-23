import {Inject, Service} from 'typedi';
import {IContext, IFlow, IPlugin, IReporter} from '../interfaces';
import * as Joi from 'joi';
import {FlowService} from './index';
import {ActionSnapshot} from '../models';
import {ActionHandlersRegistry} from './ActionHandlersRegistry';
import * as semver from 'semver';

const fblVersion: string = require('../../../package.json').version;

@Service()
export class FBLService {
    private plugins: {[name: string]: IPlugin} = {};

    public static STEP_SCHEMA = Joi.object()
        .min(1)
        .max(1)
        .required();

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

        const keys = Object.keys(flow.pipeline);

        const idOrAlias = keys[0];
        const options = flow.pipeline[idOrAlias];

        return await this.flowService.executeAction(wd, idOrAlias, options, context);
    }
}
