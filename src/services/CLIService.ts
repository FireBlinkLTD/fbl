import {Inject, Service} from 'typedi';
import * as commander from 'commander';
import * as colors from 'colors';
import {FlowService, FBLService} from './index';
import {exists} from 'fs';
import {promisify} from 'util';
import {dirname, resolve} from 'path';
import {homedir} from 'os';
import {IContext} from '../interfaces';
import {FSUtil} from '../utils/FSUtil';

const prompts = require('prompts');
const requireg = require('requireg');

@Service()
export class CLIService {
    static GLOBAL_CONFIG_PATH = resolve(homedir(), '.fbl/config');

    private colors = false;
    private flowFilePath: string;
    private reportFilePath?: string;
    private reportFormat?: string;
    private globalEJSDelimiter?: string;
    private localEJSDelimiter?: string;

    private plugins = [
        __dirname + '/../plugins/context',
        __dirname + '/../plugins/exec',
        __dirname + '/../plugins/flow',
        __dirname + '/../plugins/fs',
        __dirname + '/../plugins/reporters',
    ];

    private unsafePlugins = false;

    private configKVPairs: string[] = [];
    private secretKVPairs: string[] = [];
    private reportKVPairs: string[] = [];

    @Inject(() => FBLService)
    fbl: FBLService;

    @Inject(() => FlowService)
    flowService: FlowService;

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
            if (!this.fbl.getReporter(this.reportFormat)) {
                console.error(`Error: Unable to find reporter: ${this.reportFormat}`);
                commander.outputHelp();
                process.exit(1);
            }
        }

        const context = await this.prepareContext();

        if (this.globalEJSDelimiter) {
            context.ejsTemplateDelimiters.global = this.globalEJSDelimiter;
        }

        if (this.localEJSDelimiter) {
            context.ejsTemplateDelimiters.local = this.localEJSDelimiter;
        }

        const wd = dirname(this.flowFilePath);
        const flow = await this.flowService.readFlowFromFile(this.flowFilePath, context, wd);

        const snapshot = await this.fbl.execute(
            wd,
            flow,
            context
        );

        if (this.reportFilePath) {
            const options = {};
            await this.convertKVPairs(this.reportKVPairs, options);
            await this.fbl.getReporter(this.reportFormat).generate(this.reportFilePath, options, snapshot);
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
            const globalConfig = await FSUtil.readYamlFromFile(CLIService.GLOBAL_CONFIG_PATH);

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

            /* istanbul ignore else */
            if (globalConfig['global-template-delimiter']) {
                this.globalEJSDelimiter = globalConfig['global-template-delimiter'];
            }

            /* istanbul ignore else */
            if (globalConfig['local-template-delimiter']) {
                this.localEJSDelimiter = globalConfig['local-template-delimiter'];
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
                    'If only key is provided you will be prompted to enter the value in the console.',
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
            .option('--unsafe-plugins', 'If provided incompatible plugins will still be registered and be available for use, but may lead to unexpected results or errors.')
            .option('--no-colors', 'Remove colors from output. Make it boring.')
            .option('--global-template-delimiter <delimiter>', 'Global EJS template delimiter. Default: $')
            .option('--local-template-delimiter <delimiter>', 'Local EJS template delimiter. Default: %')
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

        if (commander.unsafePlugins) {
            this.unsafePlugins = true;
        }

        if (commander.globalTemplateDelimiter) {
            this.globalEJSDelimiter = commander.globalTemplateDelimiter;
        }

        if (commander.localTemplateDelimiter) {
            this.localEJSDelimiter = commander.localTemplateDelimiter;
        }
    }

    /**
     * Register plugins
     */
    private registerPlugins(): void {
        const plugins = this.plugins.map((path: string) => requireg(path));
        this.fbl.registerPlugins(plugins);
        this.fbl.validatePlugins(this.unsafePlugins);
    }

    /**
     * Prepare context
     * @return {Promise<IContext>}
     */
    private async prepareContext(): Promise<IContext> {
        const context = FlowService.generateEmptyContext();
        await this.convertKVPairs(this.configKVPairs, context.ctx);
        await this.convertKVPairs(this.secretKVPairs, context.secrets, true);

        return context;
    }

    /**
     * Convert key=value pairs into object
     * @param {string[]} pairs
     * @param target
     * @param secret
     */
    private async convertKVPairs(pairs: string[], target: any, secret?: boolean): Promise<void> {
        await Promise.all(pairs.map(async (kv: string): Promise<void> => {
            const chunks = kv.split('=');
            if (chunks.length !== 2) {
                chunks[1] = (await prompts({
                    type: 'text',
                    name: 'value',
                    style: secret ? 'password' : 'default',
                    message: `${chunks[0]}: `
                })).value;
            }

            if (chunks[1][0] === '@') {
                const file = chunks[1].substring(1);
                target[chunks[0]] = await FSUtil.readYamlFromFile(file);
            } else {
                target[chunks[0]] = chunks[1];
            }
        }));
    }
}
