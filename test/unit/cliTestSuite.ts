import {suite, test} from 'mocha-typescript';
import {dump} from 'js-yaml';
import {promisify} from 'util';
import {exists, readFile, unlink, writeFile} from 'fs';
import * as assert from 'assert';
import {ChildProcessService, CLIService, TempPathsRegistry} from '../../src/services';
import {basename, dirname, join, sep} from 'path';
import {Container} from 'typedi';
import {IActionStep} from '../../src/models';
import {FSUtil} from '../../src/utils';
import {DummyServerWrapper, IDummyServerWrapperConfig} from '../assets/dummy.http.server.wrapper';
import {c} from 'tar';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const fblVersion = require('../../../package.json').version;

@suite()
class CliTestSuite {
    private static existingGlobalConfig?: string;
    private static globalConfigExists?: boolean;

    private dummyServerWrappers: DummyServerWrapper[] = [];

    async before(): Promise<void> {
        if (CliTestSuite.globalConfigExists === undefined) {
            await FSUtil.mkdirp(dirname(CLIService.GLOBAL_CONFIG_PATH));
            CliTestSuite.globalConfigExists = await promisify(exists)(CLIService.GLOBAL_CONFIG_PATH);
            if (CliTestSuite.globalConfigExists) {
                CliTestSuite.existingGlobalConfig = await promisify(readFile)(CLIService.GLOBAL_CONFIG_PATH, 'utf8');
                await promisify(unlink)(CLIService.GLOBAL_CONFIG_PATH);
            }
        }
    }

    async after(): Promise<void> {
        const configExists = await promisify(exists)(CLIService.GLOBAL_CONFIG_PATH);
        if (configExists) {
            await promisify(unlink)(CLIService.GLOBAL_CONFIG_PATH);
        }

        if (CliTestSuite.globalConfigExists) {
            await promisify(writeFile)(CLIService.GLOBAL_CONFIG_PATH, CliTestSuite.existingGlobalConfig, 'utf8');
        }

        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();

        for (const dummyServerWrapper of this.dummyServerWrappers) {
            await dummyServerWrapper.stop();
        }

        this.dummyServerWrappers = [];
    }

    /**
     * Execute action
     * @param {string} cmd
     * @param {string[]} args
     * @param {string} answer
     * @param {string} wd
     * @return {Promise<{code: number; stdout: string; stderr: string}>}
     */
    private static async exec(cmd: string, args: string[], answer?: string, wd?: string): Promise<{code: number, stdout: string, stderr: string}> {
        const stdout: string[] = [];
        const stderr: string[] = [];
        const code = await Container.get(ChildProcessService).exec(
            cmd,
            args,
            wd || '.',
            {
                stdout: (data) => {
                    stdout.push(data.toString().trim());
                },

                stderr: (data) => {
                    stderr.push(data.toString().trim());
                },

                process: (process) => {
                    if (answer) {
                        setTimeout(function () {
                            process.stdin.write(answer);
                            process.stdin.end();
                        }, 100);
                    }
                }
            }
        );

        return {
            code,
            stdout: stdout.join('\n'),
            stderr: stderr.join('\n')
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
                            custom_st: '<%- secrets.custom_st %>'
                        }
                    }
                }
            }
        };

        const customContextValues = {
            custom_ct: 'file1'
        };

        const customSecretValues = {
            custom_st: 'file2'
        };

        const flowDir = await tempPathsRegistry.createTempDir();
        const reportFile = await tempPathsRegistry.createTempFile();
        const contextFile = await tempPathsRegistry.createTempFile();
        const secretsFile = await tempPathsRegistry.createTempFile();
        const flowFile = `${flowDir}/flow.yml`;

        await promisify(writeFile)(flowFile, dump(flow), 'utf8');
        await promisify(writeFile)(contextFile, dump(customContextValues), 'utf8');
        await promisify(writeFile)(secretsFile, dump(customSecretValues), 'utf8');

        const cwdPath = flowDir.split(sep);
        cwdPath.pop();

        const cwd = cwdPath.join(sep);
        const flowPath = `${basename(flowDir)}/flow.yml`;

        const result = await CliTestSuite.exec(
            'node',
            [
                `${__dirname}/../../src/cli.js`,
                '--no-colors',
                '-c', '$.ct=yes',
                '-c', `$=@${contextFile}`,
                '-s', '$.st=yes',
                '-p', `${__dirname}/../../src/plugins/flow`,
                '-s', `$=@${secretsFile}`,
                '-o', reportFile,
                '-r', 'json',
                flowPath
            ],
            null,
            cwd
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const reportJson = await promisify(readFile)(reportFile, 'utf8');
        assert(reportJson.length > 0);

        const report = JSON.parse(reportJson);
        const contextSteps = report.steps.filter((s: IActionStep) => s.type === 'context');

        assert.deepStrictEqual(contextSteps[contextSteps.length - 1].payload.ctx, {
            ct: 'yes',
            custom_ct: 'file1',
            test: {
                ct: 'yes',
                st: 'yes',
                custom_ct: 'file1',
                custom_st: 'file2'
            }
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
                            ct: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-r', 'json',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: --output parameter is required when --report is provided.');

        result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-o', '/tmp/report.json',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: --report parameter is required when --output is provided.');

        result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-o', '/tmp/report.json',
                '-r', 'unknown',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: Unable to find reporter: unknown');

        result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-o', '/tmp/report.json',
                '-r', 'json',
                '--report-option', 'test=@missing.file',
                flowFile
            ]
        );
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
                            st: '<%- secrets.st %>'
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-c', '$.ct.yes',
                '-s', '$.st=yes',
                flowFile
            ],
            'prompt_value'
        );

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
                            st: '<%- secrets.st %>'
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-c', '$.ct=yes',
                '-s', '$.st.yes',
                flowFile
            ],
            'prompt_value'
        );

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
                            custom_st: '<%- secrets.custom_st %>'
                        }
                    }
                }
            }
        };

        const customContextValues = {
            custom_ct: 'file1'
        };

        const customSecretValues = {
            custom_st: 'file2'
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        const reportFile = await tempPathsRegistry.createTempFile();
        const contextFile = await tempPathsRegistry.createTempFile();
        const secretsFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(flowFile, dump(flow), 'utf8');
        await promisify(writeFile)(contextFile, dump(customContextValues), 'utf8');
        await promisify(writeFile)(secretsFile, dump(customSecretValues), 'utf8');

        const globalConfig = {
            plugins: [
                `${__dirname}/../../src/plugins/flow`
            ],
            context: [
                '$.ct=yes',
                `$=@${contextFile}`
            ],
            secrets: [
                '$.st=yes',
                `$=@${secretsFile}`
            ],
            'no-colors': true,
            'global-template-delimiter': '$',
            'local-template-delimiter': '%'
        };

        await promisify(writeFile)(CLIService.GLOBAL_CONFIG_PATH, dump(globalConfig), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-o', reportFile,
                '-r', 'json',
                flowFile
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const reportJson = await promisify(readFile)(reportFile, 'utf8');
        assert(reportJson.length > 0);

        const report = JSON.parse(reportJson);
        const contextSteps = report.steps.filter((s: IActionStep) => s.type === 'context');

        assert.deepStrictEqual(contextSteps[contextSteps.length - 1].payload.ctx, {
            ct: 'yes',
            custom_ct: 'file1',
            test: {
                ct: 'yes',
                st: 'yes',
                custom_ct: 'file1',
                custom_st: 'file2'
            }
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
                        inline: true
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
    }

    @test()
    async noParams(): Promise<void> {
        const result = await CliTestSuite.exec('node', ['dist/src/cli.js']);
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
                            ct: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-c', '$=test',
                '--no-colors',
                flowFile
            ]
        );
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
                            tst: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/incompatibleWithFBL'),
                '--no-colors',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, `Plugin incompatible.plugin is not compatible with current fbl version (${fblVersion})`);

        result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/incompatibleWithFBL'),
                '--no-colors',
                '--unsafe-plugins',
                flowFile
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(result.stderr.split('\n')[0], `Plugin incompatible.plugin is not compatible with current fbl version (${fblVersion})`);
    }

    @test()
    async incompatibleFlowWithFBL(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            requires: {
                fbl: '0.0.0'
            },
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, `Flow is not compatible with current fbl version (${fblVersion})`);

        result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                '--unsafe-flows',
                flowFile
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(result.stderr.split('\n')[0], `Flow is not compatible with current fbl version (${fblVersion})`);
    }

    @test()
    async incompatibleFlowWithPluginByVersion(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const plugin = require('../../src/plugins/flow');

        const flow: any = {
            version: '1.0.0',
            requires: {
                plugins: {
                    [plugin.name]: '0.0.0'
                }
            },
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, `Actual plugin ${plugin.name} version ${plugin.version} doesn't satisfy required 0.0.0`);

        result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                '--unsafe-flows',
                flowFile
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(result.stderr.split('\n')[0], `Actual plugin ${plugin.name} version ${plugin.version} doesn't satisfy required 0.0.0`);
    }

    @test()
    async incompatibleFlowWithMissingPlugin(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            requires: {
                plugins: {
                    test: '0.0.1'
                }
            },
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Required plugin test is not registered. Error: Unable to locate plugin test');

        result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                '--unsafe-flows',
                flowFile
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(result.stderr.split('\n')[0], 'Required plugin test is not registered. Error: Unable to locate plugin test');
    }

    @test()
    async incompatibleFlowWithMissingApplication(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            requires: {
                applications: [
                    'missing_app_1234'
                ]
            },
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Application missing_app_1234 required by flow not found, make sure it is installed and its location presents in the PATH environment variable');

        result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                '--unsafe-flows',
                flowFile
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(result.stderr.split('\n')[0], 'Application missing_app_1234 required by flow not found, make sure it is installed and its location presents in the PATH environment variable');
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
                    [plugin.name]: `~${plugin.version}`
                },
                applications: [
                    'echo'
                ]
            },
            pipeline: {
                ctx: {
                    '$.test': {
                        inline: {
                            tst: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile
            ]
        );

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
                            tst: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/incompatibleWithOtherPlugin'),
                '--no-colors',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, `Actual plugin fbl.core.flow version ${fblVersion} doesn't satisfy required 0.0.0`);

        result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/incompatibleWithOtherPlugin'),
                '--no-colors',
                '--unsafe-plugins',
                flowFile
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(result.stderr.split('\n')[0], `Actual plugin fbl.core.flow version ${fblVersion} doesn't satisfy required 0.0.0`);
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
                            tst: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        let result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/missingPluginDependency'),
                '--no-colors',
                flowFile
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Required plugin %some.unkown.plugin% is not registered. Error: Unable to locate plugin %some.unkown.plugin%');

        result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/missingPluginDependency'),
                '--no-colors',
                '--unsafe-plugins',
                flowFile
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(result.stderr.split('\n')[0], 'Required plugin %some.unkown.plugin% is not registered. Error: Unable to locate plugin %some.unkown.plugin%');
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
                            tst: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/satisfiesDependencies'),
                '--no-colors',
                flowFile
            ]
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

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-o', reportFile,
                '-r', 'json',
                '--global-template-delimiter', '@',
                '--local-template-delimiter', '?',
                flowFile
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const report = JSON.parse(await promisify(readFile)(reportFile, 'utf8'));
        const children = report.steps.filter((v: IActionStep) => v.type === 'child');
        const contextSteps = children[children.length - 1].payload.steps.filter((v: IActionStep) => v.type === 'context');

        assert.deepStrictEqual(contextSteps[0].payload.ctx, {
            test_1: 1,
            test_2: 2
        });

        assert.deepStrictEqual(contextSteps[1].payload.ctx, {
            test_1: 1,
            test_2: 2,
            local: 1
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
            '     $.local:',
            '          inline: 1',
        ].join('\n');


        const flowFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(flowFile, flow, 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                flowFile
            ],
            'prompt_value'
        );

        assert.strictEqual(result.code, 1);
    }

    @test()
    async outputHelp(): Promise<void> {
        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-h'
            ],
            'prompt_value'
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(result.stdout.split('\n')[0], 'Usage: fbl [options] <file or url>');
    }

    static async indexFileLookupInsideDirectoryTree(extention: 'yml' | 'yaml'): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$': {
                        inline: {
                            test: true
                        }
                    }
                }
            }
        };

        const reportFile = await tempPathsRegistry.createTempFile();
        const rootDir = await tempPathsRegistry.createTempDir();
        await FSUtil.mkdirp(join(rootDir, 'l1/index.yml/l3'));
        const indexPath = join(rootDir, `l1/index.yml/l3/index.${extention}`);

        await promisify(writeFile)(indexPath, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '-o', reportFile,
                '-r', 'json',
                rootDir
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const reportJson = await promisify(readFile)(reportFile, 'utf8');
        assert(reportJson.length > 0);

        const report = JSON.parse(reportJson);
        const contextSteps = report.steps.filter((s: IActionStep) => s.type === 'context');

        assert.deepStrictEqual(contextSteps[contextSteps.length - 1].payload.ctx, {
            test: true
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
                    '$': {
                        inline: {
                            test: true
                        }
                    }
                }
            }
        };

        const rootDir = await tempPathsRegistry.createTempDir();
        await FSUtil.mkdirp(join(rootDir, 'l1/l2/l3'));
        const flowPath = join(rootDir, `l1/l2/l3/test.yml`);

        await promisify(writeFile)(flowPath, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                rootDir
            ]
        );

        assert.strictEqual(result.code, 1);
    }

    @test()
    async indexFileLookupFailureDueToMultipleParentDirs(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    '$': {
                        inline: {
                            test: true
                        }
                    }
                }
            }
        };

        const rootDir = await tempPathsRegistry.createTempDir();
        await FSUtil.mkdirp(join(rootDir, 'l1/l2/l3'));
        await FSUtil.mkdirp(join(rootDir, 'l1/l2/l4'));
        const flowPath = join(rootDir, `l1/l2/l3/index.yml`);

        await promisify(writeFile)(flowPath, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                rootDir
            ]
        );

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
                            duration: '<%- $.duration(1000) %>'
                        }
                    },
                    {
                        summary: {
                            title: 'Test2',
                            status: 'Failure',
                            duration: '<%- $.duration(0) %>'
                        }
                    },
                    {
                        summary: {
                            title: 'Test3',
                            status: 'Skipped'
                        }
                    },
                ]
            }
        };

        const flowPath = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(flowPath, dump(flow), 'utf8');

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowPath
            ]
        );

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
                            tst: true
                        }
                    }
                }
            }
        };

        const flowFile = await tempPathsRegistry.createTempFile();
        const tarballFile = await tempPathsRegistry.createTempFile(false, '.tar.gz');
        await promisify(writeFile)(flowFile, dump(flow), 'utf8');

        await c({
            gzip: true,
            cwd: dirname(flowFile),
            file: tarballFile
        }, [
            basename(flowFile)
        ]);

        const port = 62999;
        const server = new DummyServerWrapper(<IDummyServerWrapperConfig> {
            port: port,
            file: tarballFile
        });
        await server.start();
        this.dummyServerWrappers.push(server);

        const result = await CliTestSuite.exec(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                '--http-header', '"test1: y1"',
                '--http-header', '"test2:y2"',
                '--http-header', '"test3:    y3 "',
                '-t', basename(flowFile),
                `http://localhost:${port}`
            ]
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(server.lastRequest.headers.test1, 'y1');
        assert.strictEqual(server.lastRequest.headers.test2, 'y2');
        assert.strictEqual(server.lastRequest.headers.test3, 'y3 ');
    }
}
