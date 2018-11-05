import {Inject, Service} from 'typedi';
import * as commander from 'commander';
import * as colors from 'colors';
import {FlowService, FBLService} from './index';
import {exists} from 'fs';
import {promisify} from 'util';
import {resolve} from 'path';
import {homedir} from 'os';
import {IContext, IFlowLocationOptions, IReport, ISummaryRecord} from '../interfaces';
import {ContextUtil, FSUtil} from '../utils';
import * as Joi from 'joi';
import {TempPathsRegistry} from './TempPathsRegistry';
import {table} from 'table';
import {ActionSnapshot} from '../models';

const prompts = require('prompts');
const requireg = require('requireg');
const cliui = require('cliui');

@Service()
export class CLIService {
    static GLOBAL_CONFIG_PATH = resolve(homedir(), '.fbl/config');

    private colors = false;
    private flowFilePath: string;
    private flowTarget: string;
    private reportFilePath?: string;
    private reportFormat?: string;
    private globalEJSDelimiter?: string;
    private localEJSDelimiter?: string;

    private plugins = [
        __dirname + '/../plugins/context',
        __dirname + '/../plugins/exec',
        __dirname + '/../plugins/flow',
        __dirname + '/../plugins/fs',
        __dirname + '/../plugins/prompts',
        __dirname + '/../plugins/reporters',
        __dirname + '/../plugins/templateUtilities',
    ];

    private configKVPairs: string[] = [];
    private secretKVPairs: string[] = [];
    private reportKVPairs: string[] = [];
    private httpHeaders: {[key: string]: string} = {};

    @Inject(() => FBLService)
    fbl: FBLService;

    @Inject(() => FlowService)
    flowService: FlowService;

    @Inject(() => TempPathsRegistry)
    tempPathsRegistry: TempPathsRegistry;

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

        await this.registerPlugins();

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

        const flow = await this.flowService.readFlowFromFile(
            <IFlowLocationOptions> {
                path: this.flowFilePath,
                http: {
                    headers: this.httpHeaders
                },
                target: this.flowTarget
            },
            context,
            {},
            '.'
        );

        const initialContextState = this.reportFilePath ?
            JSON.parse(JSON.stringify(ContextUtil.toBase(context))) :
            null;

        const snapshot = await this.fbl.execute(
            flow.wd,
            flow.flow,
            context,
            {}
        );

        const finalContextState = this.reportFilePath ?
            JSON.parse(JSON.stringify(ContextUtil.toBase(context))) :
            null;

        if (this.reportFilePath) {
            const report = <IReport> {
                context: {
                    initial: initialContextState,
                    final: finalContextState
                },
                snapshot: snapshot
            };

            const options = {};
            await this.convertKVPairs(this.reportKVPairs, options);

            // generate report
            await this.fbl.getReporter(this.reportFormat)
                .generate(this.reportFilePath, options, report);
        }

        // remove all temp files and folders
        await this.tempPathsRegistry.cleanup();

        if (!snapshot.successful) {
            throw new Error('Execution failed.');
        } else {
            if (context.summary.length) {
                CLIService.printSummary(context.summary);
            }
        }
    }

    /**
     * Print summary
     * @param {ISummaryRecord[]} records
     */
    private static printSummary(records: ISummaryRecord[]): void {
        const includeDuration = records.find(r => !!r.duration);

        const head = ['Title'.bold, 'Status'.bold];
        /* istanbul ignore else */
        if (includeDuration) {
            head.push('Duration'.bold);
        }

        console.log();
        console.log(table(
            [
                head,
                ...records.map(r => {
                    let status = r.status.trim();

                    if (['created', 'updated', 'passed', 'success', 'ok', 'yes'].indexOf(status.toLowerCase()) >= 0) {
                        status = status.green;
                    }

                    if (['deleted', 'failed', 'failure', 'error', 'no'].indexOf(status.toLowerCase()) >= 0) {
                        status = status.red;
                    }

                    if (['ignored', 'skipped', 'none'].indexOf(status.toLowerCase()) >= 0) {
                        status = status.yellow;
                    }

                    const row = [r.title, status];
                    /* istanbul ignore else */
                    if (includeDuration) {
                        row.push(r.duration);
                    }

                    return row;
                })
            ]
        ));
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
        const options: {flags: string, description: string[], fn?: Function}[] = [
            {
                flags: '-p --plugin <file>',
                description: [
                    'Plugin file.'
                ],
                fn: (val: string) => {
                    this.plugins.push(val);
                }
            },

            {
                flags: '-c --context <key=value>',
                description: [
                    'Key value pair of default context values.',
                    'Expected key format: $[.<parent>][.child][...]',
                    'Note: if value is started with "@" it will be treated as YAML file and content will be loaded from it.'
                ],
                fn: (val: string) => {
                    this.configKVPairs.push(val);
                }
            },

            {
                flags: '-s --secret <key=value|name>',
                description: [
                    'Key value pair of default secret values. Secrets will not be available in report.',
                    'Expected key format: $[.<parent>][.child][...]',
                    'If only key is provided you will be prompted to enter the value in the console.',
                    'Note: if value is started with "@" it will be treated as YAML file and content will be loaded from it.'
                ],
                fn: (val: string) => {
                    this.secretKVPairs.push(val);
                }
            },

            {
                flags: '-o --output <file>',
                description: [
                    'Execution report path'
                ]
            },

            {
                flags: '-r --report <name>',
                description: [
                    'Execution report format'
                ]
            },

            {
                flags: '-t --target <path>',
                description: [
                    'Custom relative path inside the packaged flow (tarball).'
                ]
            },

            {
                flags: '--report-option <key=value>',
                description: [
                    'Key value pair of report option',
                    'Note: if value is started with "@" it will be treated as YAML file and content will be loaded from it.'
                ],
                fn: (val: string) => {
                    this.reportKVPairs.push(val);
                }
            },

            {
                flags: '--unsafe-plugins',
                description: [
                    'If provided incompatible plugins will still be registered and be available for use,',
                    'but may lead to unexpected results or errors.'
                ]
            },

            {
                flags: '--unsafe-flows',
                description: [
                    'If provided incompatible flow requirements will be ignored,',
                    'but may lead to unexpected results or errors.'
                ]
            },

            {
                flags: '--no-colors',
                description: [
                    'Remove colors from output. Make it boring.'
                ]
            },

            {
                flags: '--global-template-delimiter <delimiter>',
                description: [
                    'Global EJS template delimiter. Default: $'
                ]
            },

            {
                flags: '--local-template-delimiter <delimiter>',
                description: [
                    'Local EJS template delimiter. Default: %'
                ]
            },

            {
                flags: '--http-header <header>',
                description: [
                    'Custom HTTP headers to send with GET request to fetch flow from remote location.'
                ],
                fn: (val: string) => {
                    const name = val.split(':')[0];
                    this.httpHeaders[name] = val.substring(name.length + 1).trimLeft();
                }
            },

            {
                flags: '-h --help',
                description: [
                    'Output usage information'
                ],
                fn: () => {
                    this.printHelp(options);
                    process.exit(0);
                }
            }
        ];


        // prepare commander
        commander
            .version(require('../../../package.json').version)
            .arguments('<file>')
            .action((file, opts) => {
                opts.file = file;
            });

        // register options
        options.forEach(option => {
            commander.option(option.flags, option.description.join(' '), option.fn);
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
        this.flowTarget = commander.target;

        if (commander.unsafePlugins) {
            this.fbl.allowUnsafePlugins = true;
        }

        if (commander.unsafeFlows) {
            this.fbl.allowUnsafeFlows = true;
        }

        if (commander.globalTemplateDelimiter) {
            this.globalEJSDelimiter = commander.globalTemplateDelimiter;
        }

        if (commander.localTemplateDelimiter) {
            this.localEJSDelimiter = commander.localTemplateDelimiter;
        }
    }

    /**
     * Output help to stdout
     * @param options
     */
    private printHelp(options: {flags: string, description: string[]}[]): void {
        const allOptions: {flags: string, description: string[]}[] = [
            ...options,
            {
                flags: '-V, --version',
                description: [
                    'Output the version number'
                ]
            }
        ];

        let maxFlagsLength = 0;
        let maxDescriptionLength = 0;

        allOptions.forEach(option => {
            maxFlagsLength = Math.max(maxFlagsLength, option.flags.length);
            for (const line of option.description) {
                maxDescriptionLength = Math.max(maxDescriptionLength, line.length);
            }
        });

        const ui = cliui();

        ui.div('Usage: fbl [options] <file or url>');
        ui.div({
            text: 'Options:',
            padding: [1, 0, 1, 0]
        });

        allOptions.forEach(option => {
            ui.div(
                {
                    text: option.flags,
                    width: maxFlagsLength + 4,
                    padding: [0, 2, 0, 2]
                },
                {
                    text: option.description.join('\n'),
                    width: maxDescriptionLength
                }
            );
        });

        console.log(ui.toString());
    }

    /**
     * Register plugins
     */
    private async registerPlugins(): Promise<void> {
        const plugins = this.plugins.map((path: string) => requireg(path));
        this.fbl.registerPlugins(plugins);
        await this.fbl.validatePlugins(process.cwd());
    }

    /**
     * Prepare context
     * @return {Promise<IContext>}
     */
    private async prepareContext(): Promise<IContext> {
        const context = ContextUtil.generateEmptyContext();
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

            let value;
            let isObject = false;
            if (chunks[1][0] === '@') {
                const file = chunks[1].substring(1);
                value = await FSUtil.readYamlFromFile(file);

                // validate file content to be object
                const fileContentValidationResult = Joi.validate(value, Joi.object().required());
                isObject = !fileContentValidationResult.error;
            } else {
                value = chunks[1];
            }

            if (chunks[0] === '$') {
                if (isObject) {
                    await ContextUtil.assign(target, chunks[0], value);
                } else {
                    throw new Error('Unable to assign non-object value to root path "$"');
                }
            } else {
                await ContextUtil.assignToField(target, chunks[0], value);
            }
        }));
    }
}
