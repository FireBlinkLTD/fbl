import {suite, test} from 'mocha-typescript';
import {dump} from 'js-yaml';
import {promisify} from 'util';
import {exists, readFile, unlink, writeFile} from 'fs';
import {spawn} from 'child_process';
import * as assert from 'assert';
import {CLIService} from '../../src/services';
import {basename, dirname, join, sep} from 'path';
import {Container} from 'typedi';
import {IActionStep} from '../../src/models';
import {FSUtil} from '../../src/utils';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');
const fblVersion = require('../../../package.json').version;

const execCmd = async (cmd: string, args: string[], answer?: string, cwd?: string): Promise<{code: number, stdout: string, stderr: string}> => {
    return new Promise<{code: number, stdout: string, stderr: string}>(async (resolve) => {
        const process = spawn(cmd, args, {
            cwd: cwd
        });

        const stdout: string[] = [];
        process.stdout.on('data', (data) => {
            stdout.push(data.toString().trim());
        });

        const stderr: string[] = [];
        process.stderr.on('data', (data) => {
            stderr.push(data.toString().trim());
        });

        process.on('close', (code) => {
            resolve({
                stdout: stdout.join('\n'),
                stderr: stderr.join('\n'),
                code: code
            });
        });

        if (answer) {
            await new Promise(r => setTimeout(r, 100));
            process.stdin.write(answer);
            process.stdin.end();
        }
    });
};

@suite()
class CliTestSuite {
    private static existingGlobalConfig?: string;
    private static globalConfigExists?: boolean;

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

        Container.reset();
    }

    @test()
    async successfulExecution(): Promise<void> {
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

        const flowDir = await tmp.dir();
        const reportFile = await tmp.file();
        const contextFile = await tmp.file();
        const secretsFile = await tmp.file();
        const flowFile = `${flowDir.path}/flow.yml`;

        await promisify(writeFile)(flowFile, dump(flow), 'utf8');
        await promisify(writeFile)(contextFile.path, dump(customContextValues), 'utf8');
        await promisify(writeFile)(secretsFile.path, dump(customSecretValues), 'utf8');

        const cwdPath = flowDir.path.split(sep);
        cwdPath.pop();

        const cwd = cwdPath.join(sep);
        const flowPath = `${basename(flowDir.path)}/flow.yml`;

        const result = await execCmd(
            'node',
            [
                `${__dirname}/../../src/cli.js`,
                '--no-colors',
                '-c', '$.ct=yes',
                '-c', `$=@${contextFile.path}`,
                '-s', '$.st=yes',
                '-p', `${__dirname}/../../src/plugins/flow`,
                '-s', `$=@${secretsFile.path}`,
                '-o', reportFile.path,
                '-r', 'json',
                flowPath
            ],
            null,
            cwd
        );

        assert.strictEqual(result.code, 0);

        const report = await promisify(readFile)(reportFile.path, 'utf8');
        assert(report.length > 0);
        // TODO: validate options inside the report
    }

    @test()
    async invalidReportParameters(): Promise<void> {
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        let result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-r', 'json',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: --output parameter is required when --report is provided.');

        result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-o', '/tmp/report.json',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: --report parameter is required when --output is provided.');

        result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-o', '/tmp/report.json',
                '-r', 'unknown',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: Unable to find reporter: unknown');

        result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-o', '/tmp/report.json',
                '-r', 'json',
                '--report-option', 'test=@missing.file',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'ENOENT: no such file or directory, open \'missing.file\'');
    }

    @test()
    async readContextParametersFromPrompt(): Promise<void> {
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        const result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-c', '$.ct.yes',
                '-s', '$.st=yes',
                flowFile.path
            ],
            'prompt_value'
        );
        assert.strictEqual(result.code, 0);
    }

    @test()
    async readSecretsParametersFromPrompt(): Promise<void> {
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

        const flowFile = await tmp.file();

        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        const result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-c', '$.ct=yes',
                '-s', '$.st.yes',
                flowFile.path
            ],
            'prompt_value'
        );
        assert.strictEqual(result.code, 0);
    }

    @test()
    async globalConfiguration(): Promise<void> {
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

        const flowFile = await tmp.file();
        const reportFile = await tmp.file();
        const contextFile = await tmp.file();
        const secretsFile = await tmp.file();

        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');
        await promisify(writeFile)(contextFile.path, dump(customContextValues), 'utf8');
        await promisify(writeFile)(secretsFile.path, dump(customSecretValues), 'utf8');

        const globalConfig = {
            plugins: [
                `${__dirname}/../../src/plugins/flow`
            ],
            context: [
                '$.ct=yes',
                `$=@${contextFile.path}`
            ],
            secrets: [
                '$.st=yes',
                `$=@${secretsFile.path}`
            ],
            'no-colors': true,
            'global-template-delimiter': '$',
            'local-template-delimiter': '%'
        };

        await promisify(writeFile)(CLIService.GLOBAL_CONFIG_PATH, dump(globalConfig), 'utf8');

        const result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-o', reportFile.path,
                '-r', 'json',
                flowFile.path
            ]
        );

        assert.strictEqual(result.code, 0);

        const report = await promisify(readFile)(reportFile.path, 'utf8');
        assert(report.length > 0);
        // TODO: validate options inside the report
    }

    @test()
    async failedExecution(): Promise<void> {
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        const result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
    }

    @test()
    async noParams(): Promise<void> {
        const result = await execCmd('node', ['dist/src/cli.js']);
        assert.strictEqual(result.code, 1);
    }

    @test()
    async nonObjectContextRootAssignment(): Promise<void> {
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        const result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-c', '$=test',
                '--no-colors',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
    }

    @test()
    async incompatiblePluginWithFBL(): Promise<void> {
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        let result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/incompatibleWithFBL'),
                '--no-colors',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, `incompatible.plugin plugin is not compatible with current fbl version (${fblVersion})`);

        result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/incompatibleWithFBL'),
                '--no-colors',
                '--unsafe-plugins',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 0);
        assert.strictEqual(result.stderr.split('\n')[0], `incompatible.plugin plugin is not compatible with current fbl version (${fblVersion})`);
    }

    @test()
    async incompatibleFlowWithFBL(): Promise<void> {
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        let result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, `actual fbl version ${fblVersion} doesn't satisfy required 0.0.0`);

        result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                '--unsafe-flows',
                flowFile.path
            ]
        );

        assert.strictEqual(result.code, 0);
        assert.strictEqual(result.stderr.split('\n')[0], `actual fbl version ${fblVersion} doesn't satisfy required 0.0.0`);
    }

    @test()
    async incompatibleFlowWithPluginByVersion(): Promise<void> {
        const plugin = require('../../src/plugins/flow');

        const flow: any = {
            version: '1.0.0',
            requires: {
                plugins: [
                    `${plugin.name}@0.0.0`
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        let result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, `actual plugin ${plugin.name} version ${plugin.version} doesn't satisfy required 0.0.0`);

        result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                '--unsafe-flows',
                flowFile.path
            ]
        );

        assert.strictEqual(result.code, 0);
        assert.strictEqual(result.stderr.split('\n')[0], `actual plugin ${plugin.name} version ${plugin.version} doesn't satisfy required 0.0.0`);
    }

    @test()
    async incompatibleFlowWithMissingPlugin(): Promise<void> {
        const flow: any = {
            version: '1.0.0',
            requires: {
                plugins: [
                    'test@0.0.1'
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        let result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'required plugin test is not registered');

        result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                '--unsafe-flows',
                flowFile.path
            ]
        );

        assert.strictEqual(result.code, 0);
        assert.strictEqual(result.stderr.split('\n')[0], 'required plugin test is not registered');
    }

    @test()
    async incompatibleFlowWithMissingApplication(): Promise<void> {
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        let result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'application missing_app_1234 not found, make sure it is installed and its location presents in the PATH environment variable');

        result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                '--unsafe-flows',
                flowFile.path
            ]
        );

        assert.strictEqual(result.code, 0);
        assert.strictEqual(result.stderr.split('\n')[0], 'application missing_app_1234 not found, make sure it is installed and its location presents in the PATH environment variable');
    }

    @test()
    async compatibleFlow(): Promise<void> {
        const plugin = require('../../src/plugins/flow');

        const flow: any = {
            version: '1.0.0',
            requires: {
                fbl: `>=${fblVersion}`,
                plugins: [
                    `${plugin.name}@~${plugin.version}`
                ],
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        const result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '--no-colors',
                flowFile.path
            ]
        );

        assert.strictEqual(result.code, 0);
    }

    @test()
    async incompatiblePluginWithOtherPlugin(): Promise<void> {
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        let result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/incompatibleWithOtherPlugin'),
                '--no-colors',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, `incompatible.plugin plugin is not compatible with plugin fbl.core.flow@${fblVersion}`);

        result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/incompatibleWithOtherPlugin'),
                '--no-colors',
                '--unsafe-plugins',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 0);
        assert.strictEqual(result.stderr.split('\n')[0], `incompatible.plugin plugin is not compatible with plugin fbl.core.flow@${fblVersion}`);
    }

    @test()
    async missingPluginDependency(): Promise<void> {
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        let result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/missingPluginDependency'),
                '--no-colors',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'incompatible.plugin plugin requires missing plugin %some.unkown.plugin%@0.0.0');

        result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/missingPluginDependency'),
                '--no-colors',
                '--unsafe-plugins',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 0);
        assert.strictEqual(result.stderr.split('\n')[0], 'incompatible.plugin plugin requires missing plugin %some.unkown.plugin%@0.0.0');
    }

    @test()
    async satisfiedPluginDependencies(): Promise<void> {
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

        const flowFile = await tmp.file();
        await promisify(writeFile)(flowFile.path, dump(flow), 'utf8');

        const result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-p', join(__dirname, 'fakePlugins/satisfiesDependencies'),
                '--no-colors',
                flowFile.path
            ]
        );
        assert.strictEqual(result.code, 0);
    }

    @test()
    async testCustomTemplateDelimiters(): Promise<void> {
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
            '            local: <&- ctx.test_1 &>',
        ].join('\n');


        const flowFile = await tmp.file();
        const reportFile = await tmp.file();

        await promisify(writeFile)(flowFile.path, flow, 'utf8');

        const result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-o', reportFile.path,
                '-r', 'json',
                '--global-template-delimiter', '@',
                '--local-template-delimiter', '&',
                flowFile.path
            ],
            'prompt_value'
        );

        assert.strictEqual(result.code, 0);

        const report = JSON.parse(await promisify(readFile)(reportFile.path, 'utf8'));
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
        const flow: string = [
            'version: 1.0.0',
            'pipeline:',
            '  "--":',
            '    - ctx:',
            '     $.local:',
            '          inline: 1',
        ].join('\n');


        const flowFile = await tmp.file();

        await promisify(writeFile)(flowFile.path, flow, 'utf8');

        const result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                flowFile.path
            ],
            'prompt_value'
        );

        assert.strictEqual(result.code, 1);
    }

    @test()
    async outputHelp(): Promise<void> {
        const result = await execCmd(
            'node',
            [
                'dist/src/cli.js',
                '-h'
            ],
            'prompt_value'
        );

        assert.strictEqual(result.code, 0);
        assert.strictEqual(result.stdout.split('\n')[0], 'Usage: fbl [options] <file or url>');
    }
}
