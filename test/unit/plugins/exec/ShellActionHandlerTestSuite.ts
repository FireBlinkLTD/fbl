import {suite, test} from 'mocha-typescript';
import {FlowService, TempPathsRegistry} from '../../../../src/services';
import {ActionSnapshot} from '../../../../src/models';
import {ShellActionHandler} from '../../../../src/plugins/exec/ShellActionHandler';
import * as assert from 'assert';
import {Container} from 'typedi';
import {ContextUtil} from '../../../../src/utils';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {join} from 'path';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class ShellActionHandlerTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate(123, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('', context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                executable: 'test'
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate({
                executable: 'test',
                script: 'echo "hello!"'
            }, context, snapshot, {})
        ).to.be.not.rejected;


        await chai.expect(
            actionHandler.validate({
                executable: 'test',
                script: 'echo "hello!"',
                options: {
                    stderr: true
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                executable: 'test',
                script: 'echo "hello!"',
                assignResultTo: {
                    ctx: '$.something'
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                executable: 'test',
                script: 'echo "hello!"',
                assignResultTo: {
                    secrets: '$.something'
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;
    }

    @test()
    async assignResultToBoth(): Promise<void> {
        Container.get(FlowService).debug = true;

        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.execute({
            executable: '/bin/bash',
            script: 'echo "hello!"',
            options: {
                stdout: true,
                stderr: true,
                verbose: true
            },
            assignResultTo: {
                ctx: '$.tst1',
                secrets: '$.tst2'
            }
        }, context, snapshot, {});

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, 'hello!\n');
        assert.strictEqual(context.ctx.tst1.stderr, '');

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, 'hello!\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log').payload, 'stdout: hello!\n');
    }

    @test()
    async assignResultToCtx(): Promise<void> {
        Container.get(FlowService).debug = true;

        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.execute({
            executable: '/bin/bash',
            script: 'echo "hello!"',
            options: {
                stdout: true,
                stderr: true,
                verbose: true
            },
            assignResultTo: {
                ctx: '$.tst1'
            }
        }, context, snapshot, {});

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, 'hello!\n');
        assert.strictEqual(context.ctx.tst1.stderr, '');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log').payload, 'stdout: hello!\n');
    }

    @test()
    async assignResultToSecrets(): Promise<void> {
        Container.get(FlowService).debug = true;

        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.execute({
            executable: '/bin/bash',
            script: 'echo "hello!"',
            options: {
                stdout: true,
                stderr: true,
                verbose: true
            },
            assignResultTo: {
                secrets: '$.tst2'
            }
        }, context, snapshot, {});

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, 'hello!\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log').payload, 'stdout: hello!\n');
    }

    @test()
    async checkSilentStdout(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.execute({
            executable: '/bin/bash',
            script: 'echo "hello!"',
            options: {
                stdout: true,
                stderr: true,
                verbose: true
            },
            assignResultTo: {
                ctx: '$.tst1',
                secrets: '$.tst2'
            }
        }, context, snapshot, {});

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, 'hello!\n');
        assert.strictEqual(context.ctx.tst1.stderr, '');

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, 'hello!\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log'), undefined);
    }

    @test()
    async checkSilentStderr(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.execute({
            executable: '/bin/bash',
            script: 'echo "hello!" >&2',
            options: {
                stdout: true,
                stderr: true,
                verbose: true
            },
            assignResultTo: {
                ctx: '$.tst1',
                secrets: '$.tst2'
            }
        }, context, snapshot, {});

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, '');
        assert.strictEqual(context.ctx.tst1.stderr, 'hello!\n');

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, '');
        assert.strictEqual(context.secrets.tst2.stderr, 'hello!\n');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log'), undefined);
    }


    @test()
    async checkFailure(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.execute({
                executable: '/bin/bash',
                script: 'return 1',
                assignResultTo: {
                    ctx: '$.tst1'
                }
            }, context, snapshot, {})
        ).to.be.rejected;

        assert.strictEqual(context.ctx.tst1.code, 1);
    }

    @test()
    async stderr(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.execute({
            executable: '/bin/bash',
            script: 'echo "hello!" >&2',
            options: {
                stderr: true,
                verbose: true
            },
            assignResultTo: {
                ctx: '$.tst1'
            }
        }, context, snapshot, {});

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, '');
        assert.strictEqual(context.ctx.tst1.stderr, 'hello!\n');
    }

    @test()
    async missingExecutable(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.execute({
                executable: 'missing_executable',
                script: 'echo "hello!"',
                assignResultTo: {
                    ctx: '$.tst1'
                }
            }, context, snapshot, {})
        ).to.be.rejected;

        assert.strictEqual(context.ctx.tst1.code, 127);
    }

    @test()
    async noAssignmentStdout(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.execute({
                executable: '/bin/bash',
                script: 'echo "hello!"',
            }, context, snapshot, {})
        ).to.be.not.rejected;
    }

    @test()
    async noAssignmentStderr(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.execute({
                executable: '/bin/bash',
                script: 'echo "hello!" >&2',
                options: {
                    stdout: true
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;
    }

    @test()
    async workingDirectory(): Promise<void> {
        const tempPathRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const dir = await tempPathRegistry.createTempDir();
        await promisify(writeFile)(join(dir, 'a.txt'), '', 'utf8');

        await actionHandler.execute({
            executable: '/bin/bash',
            script: 'ls .',
            options: {
                stdout: true,
                stderr: false,
                verbose: true
            },
            assignResultTo: {
                ctx: '$.tst1'
            },
            wd: dir
        }, context, snapshot, {});

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout.trim(), 'a.txt');
        assert.strictEqual(context.ctx.tst1.stderr, '');
    }
}
