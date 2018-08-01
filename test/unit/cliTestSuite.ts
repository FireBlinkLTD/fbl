import {suite, test} from 'mocha-typescript';
import {dump} from 'js-yaml';
import {promisify} from 'util';
import {readFile, writeFile} from 'fs';
import {exec} from 'child_process';
import * as assert from 'assert';

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
                `-r ${reportFile.path}`,
                flowFile.path
            ].join(' ')
        );

        assert.strictEqual(result.code, 0);

        const report = await promisify(readFile)(reportFile.path, 'utf8');
        assert(report.length > 0);
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
