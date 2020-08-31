import Container, { Service } from 'typedi';
import * as commander from 'commander';
import { collideUnsafe, isObject, collide } from 'object-collider';
import * as colors from 'colors';
import { FlowService, FBLService, LogService } from './index';
import {
    IContext,
    IFlowLocationOptions,
    IPlugin,
    IReport,
    ISummaryRecord,
    IFBLGlobalConfig,
    IDelegatedParameters,
} from '../interfaces';
import { ContextUtil, FSUtil } from '../utils';
import { TempPathsRegistry } from './TempPathsRegistry';
import { table } from 'table';
import { ActionSnapshot } from '../models';

const prompts = require('prompts');
const cliui = require('cliui');

@Service()
export class CLIService {
    private globalConfig: IFBLGlobalConfig;
    private flowFilePath: string;
    private flowTarget: string;

    private static CORE_PLUGINS = [
        __dirname + '/../plugins/context',
        __dirname + '/../plugins/exec',
        __dirname + '/../plugins/flow',
        __dirname + '/../plugins/fs',
        __dirname + '/../plugins/prompts',
        __dirname + '/../plugins/reporters',
        __dirname + '/../plugins/templateUtilities',
    ];

    get fbl(): FBLService {
        return Container.get(FBLService);
    }

    get flowService(): FlowService {
        return Container.get(FlowService);
    }

    get tempPathsRegistry(): TempPathsRegistry {
        return Container.get(TempPathsRegistry);
    }

    get logService(): LogService {
        return Container.get(LogService);
    }

    async run(): Promise<void> {
        this.globalConfig = <IFBLGlobalConfig>{
            plugins: [],
            context: {
                ctx: {},
                secrets: {},
                parameters: {},
            },
            report: {
                options: {},
            },
            http: {
                headers: {},
            },
            other: {},
        };

        this.globalConfig.plugins.push(...CLIService.CORE_PLUGINS);

        await this.parseParameters();

        if (this.globalConfig.other.noColors) {
            colors.disable();
        } else {
            colors.enable();
        }

        if (commander.unsafePlugins) {
            this.fbl.allowUnsafePlugins = true;
        }

        if (commander.unsafeFlows) {
            this.fbl.allowUnsafeFlows = true;
        }

        if (this.globalConfig.report.output) {
            // enable debug mode when report generation is requested
            this.flowService.debug = true;
        }

        await this.registerPlugins();

        if (this.globalConfig.report.output) {
            if (!this.fbl.getReporter(this.globalConfig.report.type)) {
                console.error(`Error: Unable to find reporter: ${this.globalConfig.report.type}`);
                commander.outputHelp();
                process.exit(1);
            }
        }

        const context = await this.prepareContext();
        const parameters = <IDelegatedParameters>{
            parameters: this.globalConfig.context.parameters,
        };

        if (this.globalConfig.other && this.globalConfig.other.globalTemplateDelimiter) {
            context.ejsTemplateDelimiters.global = this.globalConfig.other.globalTemplateDelimiter;
        }

        if (this.globalConfig.other && this.globalConfig.other.localTemplateDelimiter) {
            context.ejsTemplateDelimiters.local = this.globalConfig.other.localTemplateDelimiter;
        }

        const source = FSUtil.getAbsolutePath(this.flowFilePath, process.cwd());
        const flow = await this.flowService.readFlowFromFile(
            <IFlowLocationOptions>{
                path: source,
                http: {
                    headers: this.globalConfig.http && this.globalConfig.http.headers,
                },
                target: this.flowTarget,
                cache: this.globalConfig.other.useCache,
            },
            context,
            new ActionSnapshot(source, '', {}, process.cwd(), 0, {}),
            parameters,
        );

        let initialContextState;
        let finalContextState;

        if (this.globalConfig.report.output) {
            initialContextState = JSON.parse(JSON.stringify(ContextUtil.toBase(context)));
        }

        const snapshot = await this.fbl.execute(source, flow.wd, flow.flow, context, parameters);
        if (this.globalConfig.report.output) {
            finalContextState = JSON.parse(JSON.stringify(ContextUtil.toBase(context)));
        }

        if (this.globalConfig.report.output) {
            const report = <IReport>{
                context: {
                    initial: initialContextState,
                    final: finalContextState,
                },
                snapshot: snapshot,
            };

            // generate report
            await this.fbl
                .getReporter(this.globalConfig.report.type)
                .generate(this.globalConfig.report.output, this.globalConfig.report.options, report);
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
        const includeDuration = records.find((r) => !!r.duration);

        const head = ['Title'.bold, 'Status'.bold];
        /* istanbul ignore else */
        if (includeDuration) {
            head.push('Duration'.bold);
        }

        console.log();
        console.log(
            table([
                head,
                ...records.map((r) => {
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
                }),
            ]),
        );
    }

    /**
     * Parse parameters passed via CLI
     */
    private async parseParameters(): Promise<void> {
        const assign: string[] = [];
        const reportOptions: string[] = [];
        const options: { flags: string; description: string[]; fn?: (value: string) => void }[] = [
            {
                flags: '-p --plugin <file>',
                description: ['Plugin file.'],
                fn: (val: string) => {
                    this.globalConfig.plugins.push(val);
                },
            },

            {
                flags: '-a --assign <key=value>',
                description: [
                    'Assign key value pair as default values for cxt, secrets or parameters.',
                    'Expected key format: $.<ctx | secrets | parameters>[.<parent>][.child][...]',
                    'Note: ',
                    ' - if value is started with "@" it will be treated as YAML file and content will be loaded from it; use @@ to escape first character to avoid this behavior',
                    ' - if value is started with "%" it will be treated as JSON string and content will be loaded from it; use %% to escape first character to avoid this behavior',
                ],
                fn: (val: string) => {
                    assign.push(val);
                },
            },

            {
                flags: '-o --output <file>',
                description: ['Execution report path'],
            },

            {
                flags: '-r --report <name>',
                description: ['Execution report format'],
            },

            {
                flags: '-t --target <path>',
                description: ['Custom relative path inside the packaged flow (tarball).'],
            },

            {
                flags: '--report-option <key=value>',
                description: [
                    'Key value pair of report option',
                    'Note: ',
                    ' - if value is started with "@" it will be treated as YAML file and content will be loaded from it; use @@ to escape first character to avoid this behavior',
                    ' - if value is started with "%" it will be treated as JSON string and content will be loaded from it; use %% to escape first character to avoid this behavior',
                ],
                fn: (val: string) => {
                    reportOptions.push(val);
                },
            },

            {
                flags: '--unsafe-plugins',
                description: [
                    'If provided incompatible plugins will still be registered and be available for use,',
                    'but may lead to unexpected results or errors.',
                ],
            },

            {
                flags: '--unsafe-flows',
                description: [
                    'If provided incompatible flow requirements will be ignored,',
                    'but may lead to unexpected results or errors.',
                ],
            },

            {
                flags: '--no-colors',
                description: ['Remove colors from output. Make it boring.'],
            },

            {
                flags: '--global-template-delimiter <delimiter>',
                description: ['Global EJS template delimiter. Default: $'],
            },

            {
                flags: '--local-template-delimiter <delimiter>',
                description: ['Local EJS template delimiter. Default: %'],
            },

            {
                flags: '--http-header <header>',
                description: ['Custom HTTP headers to send with GET request to fetch flow from remote location.'],
                fn: (val: string) => {
                    const name = val.split(':')[0];
                    this.globalConfig.http.headers[name] = val.substring(name.length + 1).trimLeft();
                },
            },

            {
                flags: '--use-cache',
                description: [
                    'Cache remote package into $FBL_HOME/cache folder.',
                    'If package already exists inside cache dir - it will be used and no HTTP requests will be made.',
                    '',
                    'Note: this option will only work for path provided to CLI.',
                    'Option has no affect on "attachment" actions inside the flow itself.',
                ],
            },

            {
                flags: '--verbose',
                description: ['Output additional logs.'],
            },

            {
                flags: '-h --help',
                description: ['Output usage information.'],
                fn: () => {
                    this.printHelp(options);
                    process.exit(0);
                },
            },
        ];

        // prepare commander
        commander
            .version(require('../../../package.json').version)
            .usage('[options] [path]')
            .arguments('[path]')
            .action((path, opts) => {
                opts.path = path;
            });

        // register options
        options.forEach((option) => {
            commander.option(option.flags, option.description.join(' '), option.fn);
        });

        commander.on('--help', () => {
            this.printHelp(options);
        });

        // parse environment variables
        await commander.parseAsync(process.argv);

        for (const v of assign) {
            await this.convertKVPair(v, this.globalConfig.context);
        }

        for (const v of reportOptions) {
            await this.convertKVPair(v, this.globalConfig.report.options);
        }

        if (!commander.path) {
            console.error('Error: flow descriptor file/url was not provided.\n');
            commander.outputHelp();
            process.exit(1);
        }

        this.globalConfig.report.output = commander.output || this.globalConfig.report.output;
        this.globalConfig.report.type = commander.report || this.globalConfig.report.type;

        if (this.globalConfig.report.output && !this.globalConfig.report.type) {
            console.error('Error: --report parameter is missing.');
            commander.outputHelp();
            process.exit(1);
        }

        this.flowFilePath = commander.path;
        this.globalConfig.other.noColors = !commander.colors;
        this.globalConfig.other.useCache = commander.useCache;
        this.globalConfig.other.allowUnsafePlugins = commander.unsafePlugins;
        this.globalConfig.other.allowUnsafeFlows = commander.unsafeFlows;
        this.flowTarget = commander.target;

        if (commander.globalTemplateDelimiter) {
            this.globalConfig.other.globalTemplateDelimiter = commander.globalTemplateDelimiter;
        }

        if (commander.localTemplateDelimiter) {
            this.globalConfig.other.localTemplateDelimiter = commander.localTemplateDelimiter;
        }

        if (commander.verbose) {
            this.logService.enableInfoLogs();
        }
    }

    /**
     * Output help to stdout
     * @param options
     */
    private printHelp(options: { flags: string; description: string[] }[]): void {
        const allOptions: { flags: string; description: string[] }[] = [
            ...options,
            {
                flags: '-V, --version',
                description: ['Output the version number'],
            },
        ];

        let maxFlagsLength = 0;
        let maxDescriptionLength = 0;

        allOptions.forEach((option) => {
            maxFlagsLength = Math.max(maxFlagsLength, option.flags.length);
            for (const line of option.description) {
                maxDescriptionLength = Math.max(maxDescriptionLength, line.length);
            }
        });

        const ui = cliui();

        ui.div('Usage: fbl [options] <file or url>');
        ui.div({
            text: 'Options:',
            padding: [1, 0, 1, 0],
        });

        allOptions.forEach((option) => {
            ui.div(
                {
                    text: option.flags,
                    width: maxFlagsLength + 4,
                    padding: [0, 2, 0, 2],
                },
                {
                    text: option.description.join('\n'),
                    width: maxDescriptionLength,
                },
            );
        });

        console.log(ui.toString());
    }

    /**
     * Register plugins
     */
    private async registerPlugins(): Promise<void> {
        const plugins: IPlugin[] = [];
        for (const nameOrPath of this.globalConfig.plugins) {
            const plugin = await FBLService.requirePlugin(nameOrPath, process.cwd());
            plugins.push(plugin);
        }

        this.fbl.registerPlugins(plugins);
        await this.fbl.validatePlugins(process.cwd());
    }

    /**
     * Prepare context
     * @return {Promise<IContext>}
     */
    private async prepareContext(): Promise<IContext> {
        const context = ContextUtil.generateEmptyContext();
        context.ctx = this.globalConfig.context.ctx;
        context.secrets = this.globalConfig.context.secrets;

        return context;
    }

    /**
     * Convert key=value pairs into object
     * @param {string} kv key/value pair string
     * @param target
     * @param secret
     */
    private async convertKVPair(kv: string, target: any): Promise<void> {
        const chunks = kv.split('=');
        if (chunks.length !== 2) {
            const secret = chunks[0].startsWith('$.secrets.');
            chunks[1] = (
                await prompts({
                    type: 'text',
                    name: 'value',
                    style: secret ? 'password' : 'default',
                    message: `${chunks[0]}: `,
                })
            ).value;
        }

        let value;
        let isObj = false;
        const path = chunks[0];

        try {
            if (chunks[1][0] === '@' && chunks[1][1] !== '@') {
                const file = chunks[1].substring(1);
                value = await FSUtil.readYamlFromFile(file);

                // validate file content to be object
                isObj = isObject(value);
            } else {
                value = chunks[1];

                if ((value[0] === '@' || value[0] === '%') && value[0] === value[1]) {
                    value = value.substring(1);
                } else if (value[0] === '%') {
                    value = JSON.parse(value.substring(1));
                    isObj = isObject(value);
                }
            }

            if (path === '$') {
                if (isObj) {
                    collide(target, value);
                } else {
                    throw new Error('Unable to assign non-object value to root path "$"');
                }
            } else {
                const parentPath = ContextUtil.getParentPath(path);
                if (parentPath !== '$') {
                    ContextUtil.instantiateObjectPath(target, parentPath);
                }

                const parent = ContextUtil.getValueAtPath(target, parentPath);
                collideUnsafe(parent, { [path.split('.').pop()]: value });
            }
        } catch (e) {
            console.error(`Unable to assign value for path "${path}" based on string: ${kv}`);
            throw e;
        }
    }
}
