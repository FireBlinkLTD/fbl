import { suite, test } from 'mocha-typescript';
import { dump } from 'js-yaml';
import { promisify } from 'util';
import { exists, readFile, unlink, writeFile } from 'fs';
import * as assert from 'assert';
import { ChildProcessService, FlowService, TempPathsRegistry } from '../../src/services';
import { basename, dirname, join, resolve, sep } from 'path';
import { Container } from 'typedi';
import { IActionStep } from '../../src/models';
import { ContextUtil, FSUtil } from '../../src/utils';
import { DummyServerWrapper, IDummyServerWrapperConfig } from '../assets/dummy.http.server.wrapper';
import { c } from 'tar';
import { IContextBase, IReport, ISummaryRecord } from '../../src/interfaces';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const fblVersion = require('../../../package.json').version;

@suite()
class CliTestSuite {
    private static existingGlobalConfig?: string;
    private static globalConfigExists?: boolean;

    private dummyServerWrappers: DummyServerWrapper[] = [];

    private static getGlobalConfigPath(): string {
        return resolve(FlowService.getHomeDir(), 'config');
    }

    async before(): Promise<void> {
        const globalConfigPath = CliTestSuite.getGlobalConfigPath();
        if (CliTestSuite.globalConfigExists === undefined) {
            await FSUtil.mkdirp(dirname(globalConfigPath));
            CliTestSuite.globalConfigExists = await promisify(exists)(globalConfigPath);
            if (CliTestSuite.globalConfigExists) {
                CliTestSuite.existingGlobalConfig = await promisify(readFile)(globalConfigPath, 'utf8');
                await promisify(unlink)(globalConfigPath);
            }
        }
    }

    async after(): Promise<void> {
        const globalConfigPath = CliTestSuite.getGlobalConfigPath();
        const configExists = await promisify(exists)(globalConfigPath);

        const promises: Promise<void>[] = [];

        if (configExists) {
            promises.push(promisify(unlink)(globalConfigPath));
        }

        if (CliTestSuite.globalConfigExists) {
            promises.push(promisify(writeFile)(globalConfigPath, CliTestSuite.existingGlobalConfig, 'utf8'));
        }

        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();

        for (const dummyServerWrapper of this.dummyServerWrappers) {
            await dummyServerWrapper.stop();

            promises.push(
                (async () => {
                    const tarballFile = await FlowService.getCachedTarballPathForURL(
                        `http://localhost:${dummyServerWrapper.config.port}`,
                    );
                    const fileExists = await FSUtil.exists(tarballFile);

                    if (fileExists) {
                        await promisify(unlink)(tarballFile);
                    }
                })(),
            );
        }

        await Promise.all(promises);
        this.dummyServerWrappers = [];
    }

    /**
     * Execute action
     * @param {string[]} args
     * @param {string} answer
     * @param {string} wd
     * @return {Promise<{code: number; stdout: string; stderr: string}>}
     */
    private static async exec(
        args: string[],
        answer?: string,
        wd?: string,
    ): Promise<{ code: number; stdout: string; stderr: string }> {
        const start = Date.now();
        const stdout: string[] = [];
        const stderr: string[] = [];

        const nodeArgs = [join(__dirname, '../../src/cli.js'), ...args];

        const code = await Container.get(ChildProcessService).exec('node', nodeArgs, wd || '.', {
            stdout: data => {
                stdout.push(data.toString().trim());
            },

            stderr: data => {
                stderr.push(data.toString().trim());
            },

            process: process => {
                if (answer) {
                    setTimeout(function() {
                        process.stdin.write(answer);
                        process.stdin.end();
                    }, 100);
                }
            },
        });
        const end = Date.now();
        console.log(`Test -> Execution of command took: ${end - start}ms`);

        return {
            code,
            stdout: stdout.join('\n'),
            stderr: stderr.join('\n'),
        };
    }

    @test()
    async successfulExecution(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            ct: '<%- ctx.ct %>',
                            st: '<%- secrets.st %>',
                            custom_ct: '<%- ctx.custom_ct %>',
                            custom_st: '<%- secrets.custom_st %>',
                        },
                    },
                },
            },
        };

        const customContextValues = {
            custom_ct: 'file1',
        };

        const customSecretValues = {
            custom_st: 'file2',
        };

        const temps = await Promise.all([
            tempPathsRegistry.createTempDir(),
            tempPathsRegistry.createTempFile(),
            tempPathsRegistry.createTempFile(),
            tempPathsRegistry.createTempFile(),
        ]);
        const flowDir = temps[0];
        const reportFile = temps[1];
        const contextFile = temps[2];
        const secretsFile = temps[3];
        const flowFile = `${flowDir}/flow.yml`;

        await Promise.all([
            promisify(writeFile)(flowFile, dump(flow), 'utf8'),
            promisify(writeFile)(contextFile, dump(customContextValues), 'utf8'),
            promisify(writeFile)(secretsFile, dump(customSecretValues), 'utf8'),
        ]);

        const cwdPath = flowDir.split(sep);
        cwdPath.pop();

        const cwd = cwdPath.join(sep);
        const flowPath = `${basename(flowDir)}/flow.yml`;

        const result = await CliTestSuite.exec(
            [
                '--no-colors',
                '-c',
                '$.ct=yes',
                '-c',
                `$=@${contextFile}`,
                '-s',
                '$.st=yes',
                '-p',
                `${__dirname}/../../src/plugins/flow`,
                '-s',
                `$=@${secretsFile}`,
                '-o',
                reportFile,
                '-r',
                'json',
                flowPath,
            ],
            null,
            cwd,
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const reportJson = await promisify(readFile)(reportFile, 'utf8');
        assert(reportJson.length > 0);

        const report = JSON.parse(reportJson);

        assert.deepStrictEqual(report.context.initial, <IContextBase>{
            ctx: {
                ct: 'yes',
                custom_ct: 'file1',
            },
            summary: <ISummaryRecord[]>[],
            entities: ContextUtil.generateEmptyContext().entities,
        });

        assert.deepStrictEqual(report.context.final, <IContextBase>{
            ctx: {
                ct: 'yes',
                custom_ct: 'file1',
                test: {
                    ct: 'yes',
                    custom_ct: 'file1',
                    custom_st: 'file2',
                    st: 'yes',
                },
            },
            summary: <ISummaryRecord[]>[],
            entities: ContextUtil.generateEmptyContext().entities,
        });

        const contextSteps = report.snapshot.steps.filter((s: IActionStep) => s.type === 'context');
        assert.deepStrictEqual(contextSteps[contextSteps.length - 1].payload, {
            added: {
                ctx: {
                    test: {
                        ct: 'yes',
                        custom_ct: 'file1',
                        custom_st: 'file2',
                        st: 'yes',
                    },
                },
            },
            deleted: {},
            updated: {},
        });
    }

    @test()
    async invalidReportParameters(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            ct: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(['-r', 'json', flowFile]);
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: --output parameter is required when --report is provided.');

        result = await CliTestSuite.exec(['-o', '/tmp/report.json', flowFile]);
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: --report parameter is required when --output is provided.');

        result = await CliTestSuite.exec(['-o', '/tmp/report.json', '-r', 'unknown', flowFile]);
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: Unable to find reporter: unknown');

        result = await CliTestSuite.exec([
            '-o',
            '/tmp/report.json',
            '-r',
            'json',
            '--report-option',
            'test=@missing.file',
            flowFile,
        ]);
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'ENOENT: no such file or directory, open \'missing.file\'');
    }

    @test()
    async readContextParametersFromPrompt(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            ct: '<%- ctx.ct %>',
                            st: '<%- secrets.st %>',
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(['-c', '$.ct.yes', '-s', '$.st=yes', flowFile], 'prompt_value');

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }
    }

    @test()
    async readSecretsParametersFromPrompt(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            ct: '<%- ctx.ct %>',
                            st: '<%- secrets.st %>',
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(['-c', '$.ct=yes', '-s', '$.st.yes', flowFile], 'prompt_value');

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }
    }

    @test()
    async globalConfiguration(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            ct: '<%- ctx.ct %>',
                            st: '<%- secrets.st %>',
                            custom_ct: '<%- ctx.custom_ct %>',
                            custom_st: '<%- secrets.custom_st %>',
                        },
                    },
                },
            },
        };

        const customContextValues = {
            custom_ct: 'file1',
        };

        const customSecretValues = {
            custom_st: 'file2',
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        const reportFile = await tempPathsRegistry.createTempFile();
        const contextFile = await tempPathsRegistry.createTempFile();
        const secretsFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(flowFile, dump(flow), 'utf8');
        await promisify(writeFile)(contextFile, dump(customContextValues), 'utf8');
        await promisify(writeFile)(secretsFile, dump(customSecretValues), 'utf8');

        const globalConfig = {
            plugins: [`${__dirname}/../../src/plugins/flow`],
            context: ['$.ct=yes', `$=@${contextFile}`],
            secrets: ['$.st=yes', `$=@${secretsFile}`],
            'no-colors': true,
            'global-template-delimiter': '$',
            'local-template-delimiter': '%',
        };

        await promisify(writeFile)(CliTestSuite.getGlobalConfigPath(), dump(globalConfig), 'utf8');

        const result = await CliTestSuite.exec(['-o', reportFile, '-r', 'json', flowFile]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const reportJson = await promisify(readFile)(reportFile, 'utf8');
        assert(reportJson.length > 0);

        const report = JSON.parse(reportJson);
        const contextSteps = report.snapshot.steps.filter((s: IActionStep) => s.type === 'context');

        assert.deepStrictEqual(contextSteps[contextSteps.length - 1].payload, {
            added: {
                ctx: {
                    test: {
                        ct: 'yes',
                        st: 'yes',
                        custom_ct: 'file1',
                        custom_st: 'file2',
                    },
                },
            },
            deleted: {},
            updated: {},
        });
    }

    @test()
    async failedExecution(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                non_existing: {
                    test: {
                        inline: true,
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(['--no-colors', flowFile]);
        assert.strictEqual(result.code, 1);
    }

    @test()
    async noParams(): Promise<void> {
        const result = await CliTestSuite.exec([]);
        assert.strictEqual(result.code, 1);
    }

    @test()
    async nonObjectContextRootAssignment(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            ct: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(['-c', '$=test', '--no-colors', flowFile]);
        assert.strictEqual(result.code, 1);
    }

    @test()
    async incompatiblePluginWithFBL(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            ['-p', 'fakePlugins/incompatibleWithFBL', '--no-colors', flowFile],
            null,
            __dirname,
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(
            result.stderr,
            `Plugin incompatible.plugin is not compatible with current fbl version (${fblVersion})`,
        );

        result = await CliTestSuite.exec(
            ['-p', 'fakePlugins/incompatibleWithFBL.js', '--no-colors', '--unsafe-plugins', flowFile],
            null,
            __dirname,
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(
            result.stderr.split('\n')[0],
            `Plugin incompatible.plugin is not compatible with current fbl version (${fblVersion})`,
        );
    }

    @test()
    async incompatibleFlowWithFBL(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            requires: {
                fbl: '0.0.0',
            },
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(['--no-colors', flowFile]);
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, `Flow is not compatible with current fbl version (${fblVersion})`);

        result = await CliTestSuite.exec(['--no-colors', '--unsafe-flows', flowFile]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(
            result.stderr.split('\n')[0],
            `Flow is not compatible with current fbl version (${fblVersion})`,
        );
    }

    @test()
    async incompatibleFlowWithPluginByVersion(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const plugin = require('../../src/plugins/flow');

        const flow: any = {
            version: '1.0.0',
            requires: {
                plugins: {
                    [plugin.name]: '0.0.0',
                },
            },
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(['--no-colors', flowFile]);
        assert.strictEqual(result.code, 1);
        assert.strictEqual(
            result.stderr,
            `Actual plugin ${plugin.name} version ${plugin.version} doesn't satisfy required 0.0.0`,
        );

        result = await CliTestSuite.exec(['--no-colors', '--unsafe-flows', flowFile]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(
            result.stderr.split('\n')[0],
            `Actual plugin ${plugin.name} version ${plugin.version} doesn't satisfy required 0.0.0`,
        );
    }

    @test()
    async incompatibleFlowWithMissingPlugin(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            requires: {
                plugins: {
                    test: '0.0.1',
                },
            },
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(['--no-colors', flowFile]);
        assert.strictEqual(result.code, 1);
        assert.strictEqual(
            result.stderr,
            'Required plugin test is not registered. Error: Unable to locate plugin test',
        );

        result = await CliTestSuite.exec(['--no-colors', '--unsafe-flows', flowFile]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(
            result.stderr.split('\n')[0],
            'Required plugin test is not registered. Error: Unable to locate plugin test',
        );
    }

    @test()
    async incompatibleFlowWithMissingApplication(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            requires: {
                applications: ['missing_app_1234'],
            },
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(['--no-colors', flowFile]);
        assert.strictEqual(result.code, 1);
        assert.strictEqual(
            result.stderr,
            'Application missing_app_1234 required by flow not found, make sure it is installed and its location presents in the PATH environment variable',
        );

        result = await CliTestSuite.exec(['--no-colors', '--unsafe-flows', flowFile]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(
            result.stderr.split('\n')[0],
            'Application missing_app_1234 required by flow not found, make sure it is installed and its location presents in the PATH environment variable',
        );
    }

    @test()
    async compatibleFlow(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const plugin = require('../../src/plugins/flow');

        const flow: any = {
            version: '1.0.0',
            requires: {
                fbl: `>=${fblVersion}`,
                plugins: {
                    [plugin.name]: `~${plugin.version}`,
                    [join(__dirname, '../../src/plugins/flow')]: `~${plugin.version}`,
                },
                applications: ['echo'],
            },
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(['--no-colors', flowFile]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }
    }

    @test()
    async incompatiblePluginWithOtherPlugin(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            ['-p', 'fakePlugins/incompatibleWithOtherPlugin', '--no-colors', flowFile],
            null,
            __dirname,
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(
            result.stderr,
            `Actual plugin fbl.core.flow version ${fblVersion} doesn't satisfy required 0.0.0`,
        );

        result = await CliTestSuite.exec(
            ['-p', 'fakePlugins/incompatibleWithOtherPlugin', '--no-colors', '--unsafe-plugins', flowFile],
            null,
            __dirname,
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(
            result.stderr.split('\n')[0],
            `Actual plugin fbl.core.flow version ${fblVersion} doesn't satisfy required 0.0.0`,
        );
    }

    @test()
    async missingPluginDependency(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            ['-p', 'fakePlugins/missingPluginDependency', '--no-colors', flowFile],
            null,
            __dirname,
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(
            result.stderr,
            'Required plugin %some.unkown.plugin% is not registered. Error: Unable to locate plugin %some.unkown.plugin%',
        );

        result = await CliTestSuite.exec(
            ['-p', 'fakePlugins/missingPluginDependency', '--no-colors', '--unsafe-plugins', flowFile],
            null,
            __dirname,
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(
            result.stderr.split('\n')[0],
            'Required plugin %some.unkown.plugin% is not registered. Error: Unable to locate plugin %some.unkown.plugin%',
        );
    }

    @test()
    async satisfiedPluginDependencies(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            ['-p', 'fakePlugins/satisfiesDependencies', '--no-colors', flowFile],
            null,
            __dirname,
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }
    }

    @test()
    async testCustomTemplateDelimiters(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: string = [
            'version: 1.0.0',
            'pipeline:',
            '  "--":',
            '  <@ [1,2].forEach(i => { @>',
            '    - ctx:',
            '        $:',
            '          inline:',
            '            test_<@- i @>: <@- i @>',
            '  <@ }) @>',
            '    - ctx:',
            '        $:',
            '          inline:',
            '            local: <?- ctx.test_1 ?>',
        ].join('\n');

        const flowFile = await tempPathsRegistry.createTempFile();
        const reportFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(flowFile, flow, 'utf8');

        const result = await CliTestSuite.exec([
            '-o',
            reportFile,
            '-r',
            'json',
            '--global-template-delimiter',
            '@',
            '--local-template-delimiter',
            '?',
            flowFile,
        ]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const report = JSON.parse(await promisify(readFile)(reportFile, 'utf8'));
        const children = report.snapshot.steps.filter((v: IActionStep) => v.type === 'child');
        const contextSteps1 = children[children.length - 3].payload.steps.filter(
            (v: IActionStep) => v.type === 'context',
        );
        const contextSteps2 = children[children.length - 2].payload.steps.filter(
            (v: IActionStep) => v.type === 'context',
        );
        const contextSteps3 = children[children.length - 1].payload.steps.filter(
            (v: IActionStep) => v.type === 'context',
        );

        assert.deepStrictEqual(contextSteps1[0].payload, {
            added: {
                ctx: {
                    test_1: 1,
                },
            },
            deleted: {},
            updated: {},
        });

        assert.deepStrictEqual(contextSteps2[0].payload, {
            added: {
                ctx: {
                    test_2: 2,
                },
            },
            deleted: {},
            updated: {},
        });

        assert.deepStrictEqual(contextSteps3[0].payload, {
            added: {
                ctx: {
                    local: 1,
                },
            },
            deleted: {},
            updated: {},
        });
    }

    @test()
    async testBrokenFlowFile(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: string = [
            'version: 1.0.0',
            'pipeline:',
            '  "--":',
            '    - ctx:',
            '    $.local:', // <- wrong indentation
            '          inline: 1',
        ].join('\n');

        const flowFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec([flowFile], 'prompt_value');

        if (result.code === 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }
    }

    @test()
    async testLocalTemplatePassingValueByReference(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow = ['pipeline:', '  ctx:', '    "$.test_[]":', '      inline: $ref:ctx.array'].join('\n');

        const reportFile = await tempPathsRegistry.createTempFile();
        const flowFile = await tempPathsRegistry.createTempFile();
        const ctxFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, flow, 'utf8');

        await promisify(writeFile)(ctxFile, '[1]', 'utf8');

        const result = await CliTestSuite.exec(
            ['-o', reportFile, '-r', 'json', '-c', `$.array=@${ctxFile}`, flowFile],
            'prompt_value',
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const reportJson = await promisify(readFile)(reportFile, 'utf8');
        assert(reportJson.length > 0);
        const report = JSON.parse(reportJson);

        assert.deepStrictEqual(report.context.final.ctx, {
            'test_[]': [1],
            array: [1],
        });
    }

    @test()
    async testLocalTemplateEscape(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        let flow = [
            'pipeline:',
            '  ctx:',
            '    "$.test_@":',
            '      inline: <%= "@test  " %>',
            '    "$.test_n":',
            '      inline: <%= 1 %>',
            '    "$.test_b":',
            '      inline: <%= true %>',
        ].join('\n');

        const reportFile = await tempPathsRegistry.createTempFile();
        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, flow, 'utf8');

        let result = await CliTestSuite.exec(['-o', reportFile, '-r', 'json', flowFile], 'prompt_value');

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const reportJson = await promisify(readFile)(reportFile, 'utf8');
        assert(reportJson.length > 0);
        const report = JSON.parse(reportJson);

        assert.deepStrictEqual(report.context.final.ctx, {
            'test_@': '@test  ',
            test_n: 1,
            test_b: true,
        });

        // test failure

        flow = ['pipeline:', '  ctx:', '    "$.test_failure":', '      inline: <%= new Promise(() => {}); %>'].join(
            '\n',
        );

        await promisify(writeFile)(flowFile, flow, 'utf8');

        result = await CliTestSuite.exec(['--no-colors', '--verbose', flowFile], 'prompt_value');

        if (result.code === 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert(result.stderr.indexOf('Value could not be escaped. Use $ref:path to pass value by reference.') >= 0);
    }

    @test()
    async outputHelp(): Promise<void> {
        const result = await CliTestSuite.exec(['-h'], 'prompt_value');

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(result.stdout.split('\n')[0], 'Usage: fbl [options] <file or url>');
    }

    static async indexFileLookupInsideDirectoryTree(ext: 'yml' | 'yaml'): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    $: {
                        inline: {
                            test: true,
                        },
                    },
                },
            },
        };

        const reportFile = await tempPathsRegistry.createTempFile();
        const rootDir = await tempPathsRegistry.createTempDir();
        await FSUtil.mkdirp(join(rootDir, 'l1/index.yml/l3'));
        const indexPath = join(rootDir, `l1/index.yml/l3/index.${ext}`);

        await promisify(writeFile)(indexPath, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(['-o', reportFile, '-r', 'json', rootDir]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const reportJson = await promisify(readFile)(reportFile, 'utf8');
        assert(reportJson.length > 0);

        const report = JSON.parse(reportJson);
        const contextSteps = report.snapshot.steps.filter((s: IActionStep) => s.type === 'context');

        assert.deepStrictEqual(contextSteps[contextSteps.length - 1].payload, {
            added: {
                ctx: {
                    test: true,
                },
            },
            deleted: {},
            updated: {},
        });
    }

    @test()
    async indexYmlLookupInsideDirectoryTree(): Promise<void> {
        await CliTestSuite.indexFileLookupInsideDirectoryTree('yml');
    }

    @test()
    async indexYamlLookupInsideDirectoryTree(): Promise<void> {
        await CliTestSuite.indexFileLookupInsideDirectoryTree('yaml');
    }

    @test()
    async indexFileLookupFailure(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    $: {
                        inline: {
                            test: true,
                        },
                    },
                },
            },
        };

        const rootDir = await tempPathsRegistry.createTempDir();
        await FSUtil.mkdirp(join(rootDir, 'l1/l2/l3'));
        const flowPath = join(rootDir, `l1/l2/l3/test.yml`);

        await promisify(writeFile)(flowPath, dump(flow), 'utf8');

        const result = await CliTestSuite.exec([rootDir]);

        assert.strictEqual(result.code, 1);
    }

    @test()
    async indexFileLookupFailureDueToMultipleParentDirs(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    $: {
                        inline: {
                            test: true,
                        },
                    },
                },
            },
        };

        const rootDir = await tempPathsRegistry.createTempDir();
        await FSUtil.mkdirp(join(rootDir, 'l1/l2/l3'));
        await FSUtil.mkdirp(join(rootDir, 'l1/l2/l4'));
        const flowPath = join(rootDir, `l1/l2/l3/index.yml`);

        await promisify(writeFile)(flowPath, dump(flow), 'utf8');

        const result = await CliTestSuite.exec([rootDir]);

        assert.strictEqual(result.code, 1);
    }

    @test()
    async testSummary(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                '--': [
                    {
                        summary: {
                            title: 'Test1',
                            status: 'Success',
                            duration: '<%- $.duration(1000) %>',
                        },
                    },
                    {
                        summary: {
                            title: 'Test2',
                            status: 'Failure',
                            duration: '<%- $.duration(0) %>',
                        },
                    },
                    {
                        summary: {
                            title: 'Test3',
                            status: 'Skipped',
                        },
                    },
                ],
            },
        };

        const flowPath = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowPath, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(['--no-colors', flowPath]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }
    }

    @test()
    async testHttpHeaders(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const flow: any = {
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true,
                        },
                    },
                },
            },
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        const tarballFile = await tempPathsRegistry.createTempFile(false, '.tar.gz');
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        await c(
            {
                gzip: true,
                cwd: dirname(flowFile),
                file: tarballFile,
            },
            [basename(flowFile)],
        );

        const port = 62999;
        const server = new DummyServerWrapper(<IDummyServerWrapperConfig>{
            port: port,
            file: tarballFile,
        });
        await server.start();
        this.dummyServerWrappers.push(server);

        const args = [
            '--no-colors',
            '--http-header',
            '"test1: y1"',
            '--http-header',
            '"test2:y2"',
            '--http-header',
            '"test3:    y3 "',
            '--use-cache',
            '-t',
            basename(flowFile),
            `http://localhost:${port}`,
        ];

        let result = await CliTestSuite.exec(args);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(server.lastRequest.headers.test1, 'y1');
        assert.strictEqual(server.lastRequest.headers.test2, 'y2');
        assert.strictEqual(server.lastRequest.headers.test3, 'y3 ');

        // run one more time to check cache match
        result = await CliTestSuite.exec(args);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(server.requestCount, 1);
    }

    @test()
    async metadataParameters(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const flowPath = await tempPathsRegistry.createTempFile();
        const reportPath = await tempPathsRegistry.createTempFile();

        const flow: any = {
            pipeline: {
                $parameters: {
                    meta: 'yes',
                },
                ctx: {
                    '$.field': {
                        inline: '<%- parameters.meta %>',
                    },
                },
            },
        };
        await promisify(writeFile)(flowPath, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(['--no-colors', '-r', 'yaml', '-o', reportPath, flowPath]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const report: IReport = await FSUtil.readYamlFromFile(reportPath);
        assert.deepStrictEqual(report.context.final.ctx, {
            field: 'yes',
        });
    }

    @test()
    async propagatedProperties(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const attachmentFlowPath = await tempPathsRegistry.createTempFile();
        const mainFlowPath = await tempPathsRegistry.createTempFile();
        const reportPath = await tempPathsRegistry.createTempFile();

        const attachmentFlow: any = {
            pipeline: {
                ctx: {
                    '$.attachment': {
                        inline: {
                            '<%- parameters.test %>': 'a',
                        },
                    },
                },
            },
        };
        await promisify(writeFile)(attachmentFlowPath, dump(attachmentFlow), 'utf8');

        const mainFlow: any = {
            pipeline: {
                '--': [
                    {
                        virtual: {
                            id: 'virtual.test',
                            parametersSchema: {
                                type: 'object',
                                properties: {
                                    test: {
                                        type: 'string',
                                    },
                                },
                            },
                            action: {
                                '--': [
                                    {
                                        ctx: {
                                            '$.sequence': {
                                                inline: {
                                                    '<%- parameters.test %>': '<%- iteration.index %>',
                                                },
                                            },
                                        },
                                    },
                                    {
                                        '||': [
                                            {
                                                ctx: {
                                                    '$.parallel': {
                                                        inline: {
                                                            '<%- parameters.test %>': '<%- iteration.index %>',
                                                        },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                    {
                                        each: {
                                            of: ['a'],
                                            action: {
                                                ctx: {
                                                    '$.each': {
                                                        inline: {
                                                            '<%- parameters.test %>':
                                                                '<%- iteration.index %>-<%- iteration.value %>',
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    {
                                        repeat: {
                                            times: 1,
                                            action: {
                                                ctx: {
                                                    '$.repeat': {
                                                        inline: {
                                                            '<%- parameters.test %>': '<%- iteration.index %>',
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    {
                                        '@': attachmentFlowPath,
                                    },
                                ],
                            },
                        },
                    },
                    {
                        'virtual.test': {
                            test: 'yes',
                        },
                    },
                ],
            },
        };
        await promisify(writeFile)(mainFlowPath, dump(mainFlow), 'utf8');

        const result = await CliTestSuite.exec(['--no-colors', '-r', 'yaml', '-o', reportPath, mainFlowPath]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const report = await FSUtil.readYamlFromFile(reportPath);

        const expectedContext = ContextUtil.toBase(ContextUtil.generateEmptyContext());
        expectedContext.ctx = {
            sequence: {
                yes: 0,
            },
            parallel: {
                yes: 0,
            },
            each: {
                yes: '0-a',
            },
            repeat: {
                yes: 0,
            },
            attachment: {
                yes: 'a',
            },
        };

        assert.deepStrictEqual(report.context.final, expectedContext);
    }
}
