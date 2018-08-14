import {Inject, Service} from 'typedi';
import * as commander from 'commander';
import * as colors from 'colors';
import {FireBlinkLogistics} from '../fbl';
import {ActionHandlersRegistry, FlowService} from './index';
import {exists} from 'fs';
import {promisify} from 'util';
import {dirname, resolve} from 'path';
import {homedir} from 'os';
import {IContext, IPlugin, IReporter} from '../interfaces';

const requireg = require('requireg');

@Service()
export class CLIService {
    static GLOBAL_CONFIG_PATH = resolve(homedir(), '.fbl/config');

    private colors = false;
    private flowFilePath: string;
    private reportFilePath?: string;
    private reportFormat?: string;

    private reporters: {[name: string]: IReporter} = {};

    private plugins = [
        __dirname + '/../plugins/flow',
        __dirname + '/../plugins/context',
        __dirname + '/../plugins/files',
        __dirname + '/../plugins/reporters',
    ];

    private configKVPairs: string[] = [];
    private secretKVPairs: string[] = [];
    private reportKVPairs: string[] = [];

    @Inject()
    fireBlinkLogistics: FireBlinkLogistics;

    @Inject()
    flowService: FlowService;

    @Inject()
    actionHandlersRegistry: ActionHandlersRegistry;

    async run(): Promise<void> {
        await this.readGlobalConfig();
        this.parseParameters();

        if (this.colors) {
            colors.enable();
        } else {
            colors.disable();
        }

        if (this.reportFilePath) {
            // enable debug mode when report generation is requested
            this.flowService.debug = true;
        }

        this.registerPlugins();

        if (this.reportFormat) {
            if (!this.reporters[this.reportFormat]) {
                console.error(`Error: Unable to find reporter: ${this.reportFormat}`);
                commander.outputHelp();
                process.exit(1);
            }
        }

        const context = await this.prepareContext();
        const flow = await this.flowService.readFlowFromFile(this.flowFilePath);

        const snapshot = await this.fireBlinkLogistics.execute(
            dirname(this.flowFilePath),
            flow,
            context
        );

        if (this.reportFilePath) {
            const options = {};
            await this.convertKVPairs(this.reportKVPairs, options);
            await this.reporters[this.reportFormat].generate(this.reportFilePath, options, snapshot);
        }

        if (!snapshot.successful) {
            throw new Error('Execution failed.');
        }
    }

    /**
     * Read global config (if exists)
     * @return {Promise<void>}
     */
    private async readGlobalConfig(): Promise<void> {
        const globalConfigExists = await promisify(exists)(CLIService.GLOBAL_CONFIG_PATH);

        if (globalConfigExists) {
            const globalConfig = await this.flowService.readYamlFromFile(CLIService.GLOBAL_CONFIG_PATH);

            /* istanbul ignore else */
            if (globalConfig.plugins) {
                this.plugins.push(...globalConfig.plugins);
            }

            /* istanbul ignore else */
            if (globalConfig.context) {
                this.configKVPairs.push(...globalConfig.context);
            }

            /* istanbul ignore else */
            if (globalConfig.secrets) {
                this.secretKVPairs.push(...globalConfig.secrets);
            }

            /* istanbul ignore else */
            if (globalConfig['no-colors']) {
                this.colors = false;
            }
        }
    }

    /**
     * Parse parameters passed via CLI
     */
    private parseParameters(): void {
        // prepare commander
        commander
            .version(require('../../../package.json').version)
            .option(
                '-p --plugin <file>',
                '[optional] Plugin file.',
                (val) => {
                    this.plugins.push(val);
                }
            )
            .option(
                '-c --context <key=value>',
                [
                    'Key value pair of default context values.',
                    'Note: if value is started with "@" it will be treated as YAML file and content will be loaded from it.'
                ].join(' '),
                (val) => {
                    this.configKVPairs.push(val);
                }
            )
            .option(
                '-s --secret <key=value|name>',
                [
                    'Key value pair of default secret values. Secrets will not be available in report.',
                    'Note: if value is started with "@" it will be treated as YAML file and content will be loaded from it.'
                ].join(' '),
                (val) => {
                    this.secretKVPairs.push(val);
                }
            )
            .option('-o --output <file>', 'Execution report path')
            .option('-r --report <name>', 'Execution report format')
            .option('--report-option <key=value>', [
                    'Key value pair of report option',
                    'Note: if value is started with "@" it will be treated as YAML file and content will be loaded from it.'
                ].join(' '),
                (val) => {
                    this.reportKVPairs.push(val);
                }
            )
            .option('--no-colors', 'Remove colors from output. Make it boring.')
            .arguments('<file>')
            .action((file, options) => {
                options.file = file;
            });

        // parse environment variables
        commander.parse(process.argv);

        if (!commander.file) {
            console.error('Error: flow descriptor file was not provided.');
            commander.outputHelp();
            process.exit(1);
        }

        if (commander.output || commander.report) {
            if (!commander.output) {
                console.error('Error: --output parameter is required when --report is provided.');
                commander.outputHelp();
                process.exit(1);
            }

            if (!commander.report) {
                console.error('Error: --report parameter is required when --output is provided.');
                commander.outputHelp();
                process.exit(1);
            }

            this.reportFilePath = commander.output;
            this.reportFormat = commander.report;
        }

        this.flowFilePath = commander.file;
        this.colors = commander.colors;
    }

    /**
     * Register plugins
     */
    private registerPlugins(): void {
        // register plugins
        this.plugins.forEach((path: string) => {
            const plugin: IPlugin = requireg(path);

            const actionHandlers = plugin.getActionHandlers && plugin.getActionHandlers();
            if (actionHandlers) {
                actionHandlers.forEach(actionHander => {
                    this.actionHandlersRegistry.register(actionHander);
                });
            }

            const reporters = plugin.getReporters && plugin.getReporters();
            if (reporters) {
                reporters.forEach(reporter => {
                   this.reporters[reporter.getName()] = reporter;
                });
            }
        });
    }

    /**
     * Prepare context
     * @return {Promise<IContext>}
     */
    private async prepareContext(): Promise<IContext> {
        const context = FlowService.generateEmptyContext();
        await this.convertKVPairs(this.configKVPairs, context.ctx);
        await this.convertKVPairs(this.secretKVPairs, context.secrets);

        return context;
    }

    /**
     * Convert key=value pairs into object
     * @param {string[]} pairs
     * @param target
     */
    private async convertKVPairs(pairs: string[], target: any): Promise<void> {
        await Promise.all(pairs.map(async (kv: string): Promise<void> => {
            const chunks = kv.split('=');
            if (chunks.length !== 2) {
                throw new Error('Unable to extract key=value pair from: ' + kv);
            }

            if (chunks[1][0] === '@') {
                const file = chunks[1].substring(1);
                target[chunks[0]] = await this.flowService.readYamlFromFile(file);
            } else {
                target[chunks[0]] = chunks[1];
            }
        }));
    }
}
