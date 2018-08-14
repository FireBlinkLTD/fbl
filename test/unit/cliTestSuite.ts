import {suite, test} from 'mocha-typescript';
import {dump} from 'js-yaml';
import {promisify} from 'util';
import {exists, readFile, unlink, writeFile} from 'fs';
import {exec} from 'child_process';
import * as assert from 'assert';
import {CLIService} from '../../src/services';
import {mkdir} from 'shelljs';
import {dirname} from 'path';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

const execCmd = async (cmd: string): Promise<{code: number, stdout: string, stderr: string}> => {
    return await new Promise<{code: number, stdout: string, stderr: string}>((resolve) => {
        exec(cmd, (err, stdout, stderr) => {
            stdout = stdout && stdout.trim();
            stderr = stderr && stderr.trim();
            let code = 0;

            if (err) {
                const _err: any = err;

                if (_err.code) {
                    code = _err.code;
                }
            }

            resolve({stdout, stderr, code});
        });
    });
};

@suite()
class CliTestSuite {
    private existingGlobalConfig?: string;
    private globalConfigExists?: boolean;

    async before(): Promise<void> {
        if (this.globalConfigExists === undefined) {
            mkdir('-p', dirname(CLIService.GLOBAL_CONFIG_PATH));
            this.globalConfigExists = await promisify(exists)(CLIService.GLOBAL_CONFIG_PATH);
            if (this.globalConfigExists) {
                this.existingGlobalConfig = await promisify(readFile)(CLIService.GLOBAL_CONFIG_PATH, 'utf8');
            }
        }

    }

    async after(): Promise<void> {
        const configExists = await promisify(exists)(CLIService.GLOBAL_CONFIG_PATH);
        if (configExists) {
            promisify(unlink)(CLIService.GLOBAL_CONFIG_PATH);
        }

        if (this.globalConfigExists) {
            await promisify(writeFile)(CLIService.GLOBAL_CONFIG_PATH, this.existingGlobalConfig, 'utf8');
        }
    }

    @test()
    async successfulExecution(): Promise<void> {
        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    test: {
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

        const result = await execCmd(
            [
                'node dist/src/cli.js --no-colors',
                '-c ct=yes',
                `-c .=@${contextFile.path}`,
                '-s st=yes',
                `-p ${__dirname}/../../src/plugins/flow`,
                `-s .=@${secretsFile.path}`,
                `-o ${reportFile.path}`,
                '-r json',
                flowFile.path
            ].join(' ')
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
                    test: {
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
            [
                'node dist/src/cli.js',
                '-r json',
                flowFile.path
            ].join(' ')
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: --output parameter is required when --report is provided.');

        result = await execCmd(
            [
                'node dist/src/cli.js',
                '-o /tmp/report.json',
                flowFile.path
            ].join(' ')
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: --report parameter is required when --output is provided.');

        result = await execCmd(
            [
                'node dist/src/cli.js',
                '-o /tmp/report.json',
                '-r unknown',
                flowFile.path
            ].join(' ')
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Error: Unable to find reporter: unknown');

        result = await execCmd(
            [
                'node dist/src/cli.js',
                '-o /tmp/report.json',
                '-r json',
                '--report-option test=@missing.file',
                flowFile.path
            ].join(' ')
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'ENOENT: no such file or directory, open \'missing.file\'');
    }

    @test()
    async invalidContextParameters(): Promise<void> {
        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    test: {
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
            [
                'node dist/src/cli.js',
                '-c ct.yes',
                '-s st=yes',
                flowFile.path
            ].join(' ')
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Unable to extract key=value pair from: ct.yes');
    }

    @test()
    async invalidSecretsParameters(): Promise<void> {
        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    test: {
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
            [
                'node dist/src/cli.js',
                '-c ct=yes',
                '-s st.yes',
                flowFile.path
            ].join(' ')
        );
        assert.strictEqual(result.code, 1);
        assert.strictEqual(result.stderr, 'Unable to extract key=value pair from: st.yes');
    }

    @test()
    async globalConfiguration(): Promise<void> {
        const flow: any = {
            version: '1.0.0',
            pipeline: {
                ctx: {
                    test: {
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
                'ct=yes',
                `.=@${contextFile.path}`
            ],
            secrets: [
                'st=yes',
                `.=@${secretsFile.path}`
            ],
            'no-colors': true
        };

        await promisify(writeFile)(CLIService.GLOBAL_CONFIG_PATH, dump(globalConfig), 'utf8');

        const result = await execCmd(
            [
                'node dist/src/cli.js',
                `-o ${reportFile.path}`,
                '-r json',
                flowFile.path
            ].join(' ')
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

        const result = await execCmd(`node dist/src/cli.js --no-colors ${flowFile.path}`);
        assert.strictEqual(result.code, 1);
    }

    @test()
    async noParams(): Promise<void> {
        const result = await execCmd(`node dist/src/cli.js`);
        assert.strictEqual(result.code, 1);
    }
}
