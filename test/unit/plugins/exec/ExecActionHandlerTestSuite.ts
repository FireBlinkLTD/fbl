import { suite, test } from 'mocha-typescript';
import { FlowService } from '../../../../src/services';
import { ActionSnapshot, EnabledActionSnapshot } from '../../../../src/models';
import { ExecActionHandler } from '../../../../src/plugins/exec/ExecActionHandler';
import * as assert from 'assert';
import { Container } from 'typedi';
import { resolve } from 'path';
import { ContextUtil } from '../../../../src/utils';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class ExecActionHandlerTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor('', context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        command: 'test',
                        args: '-t no',
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    command: 'test',
                },
                context,
                snapshot,
                {},
            )
            .validate(),
            await actionHandler
                .getProcessor(
                    {
                        command: 'test',
                        args: ['-t', 'no'],
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate();

        await actionHandler
            .getProcessor(
                {
                    command: 'test',
                    args: ['-t', 'no'],
                    options: {
                        stderr: true,
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    command: 'test',
                    assignResultTo: {
                        ctx: '$.something',
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    command: 'test',
                    assignResultTo: {
                        secrets: '$.something',
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async assignResultToBoth(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new EnabledActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    command: 'echo',
                    args: ['test'],
                    options: {
                        stdout: true,
                        stderr: true,
                        verbose: true,
                    },
                    assignResultTo: {
                        ctx: '$.tst1',
                        secrets: '$.tst2',
                    },
                },
                context,
                snapshot,
                {},
            )
            .execute();

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, 'test\n');
        assert.strictEqual(context.ctx.tst1.stderr, '');

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, 'test\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log').payload, 'stdout: test\n');
    }

    @test()
    async assignResultToCtx(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new EnabledActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    command: 'echo',
                    args: ['test'],
                    options: {
                        stdout: true,
                        stderr: true,
                        verbose: true,
                    },
                    assignResultTo: {
                        ctx: '$.tst1',
                    },
                    pushResultTo: {
                        ctx: '$.tst2',
                    },
                },
                context,
                snapshot,
                {},
            )
            .execute();

        const expectedResult = {
            code: 0,
            stdout: 'test\n',
            stderr: '',
        };

        assert.deepStrictEqual(context.ctx.tst1, expectedResult);
        assert.deepStrictEqual(context.ctx.tst2, [expectedResult]);

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log').payload, 'stdout: test\n');
    }

    @test()
    async assignResultToSecrets(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new EnabledActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    command: 'echo',
                    args: ['test'],
                    options: {
                        stdout: true,
                        stderr: true,
                        verbose: true,
                    },
                    assignResultTo: {
                        secrets: '$.tst2',
                    },
                },
                context,
                snapshot,
                {},
            )
            .execute();

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, 'test\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log').payload, 'stdout: test\n');
    }

    @test()
    async checkSilentStdout(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    command: 'echo',
                    args: ['test'],
                    options: {
                        stdout: true,
                        stderr: true,
                        verbose: true,
                    },
                    assignResultTo: {
                        ctx: '$.tst1',
                        secrets: '$.tst2',
                    },
                },
                context,
                snapshot,
                {},
            )
            .execute();

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, 'test\n');
        assert.strictEqual(context.ctx.tst1.stderr, '');

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, 'test\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log'), undefined);
    }

    @test()
    async checkSilentStderr(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    command: 'bash',
                    args: [resolve(__dirname, '../../../../../test/assets/echo_to_stderr.sh'), 'test'],
                    options: {
                        stdout: true,
                        stderr: true,
                        verbose: true,
                    },
                    assignResultTo: {
                        ctx: '$.tst1',
                        secrets: '$.tst2',
                    },
                },
                context,
                snapshot,
                {},
            )
            .execute();

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, '');
        assert.strictEqual(context.ctx.tst1.stderr, 'test\n');

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, '');
        assert.strictEqual(context.secrets.tst2.stderr, 'test\n');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log'), undefined);
    }

    @test()
    async checkFailure(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        command: 'return',
                        args: ['1'],
                        assignResultTo: {
                            ctx: '$.tst1',
                        },
                    },
                    context,
                    snapshot,
                    {},
                )
                .execute(),
        ).to.be.rejected;

        assert.strictEqual(context.ctx.tst1.code, 1);
    }

    @test()
    async stderr(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    command: 'bash',
                    args: [resolve(__dirname, '../../../../../test/assets/echo_to_stderr.sh'), 'test'],
                    options: {
                        stderr: true,
                        verbose: true,
                    },
                    assignResultTo: {
                        ctx: '$.tst1',
                    },
                },
                context,
                snapshot,
                {},
            )
            .execute();

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, '');
        assert.strictEqual(context.ctx.tst1.stderr, 'test\n');
    }

    @test()
    async missingExecutable(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        command: 'missing_executable',
                        assignResultTo: {
                            ctx: '$.tst1',
                        },
                    },
                    context,
                    snapshot,
                    {},
                )
                .execute(),
        ).to.be.rejected;

        assert.strictEqual(context.ctx.tst1.code, -1);
    }

    @test()
    async noAssignmentStdout(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        command: 'echo',
                        args: ['test'],
                    },
                    context,
                    snapshot,
                    {},
                )
                .execute(),
        ).to.be.not.rejected;
    }

    @test()
    async noAssignmentStderr(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    command: 'bash',
                    args: [resolve(__dirname, '../../../../../test/assets/echo_to_stderr.sh'), 'test'],
                    options: {
                        stdout: true,
                    },
                },
                context,
                snapshot,
                {},
            )
            .execute();
    }
}
