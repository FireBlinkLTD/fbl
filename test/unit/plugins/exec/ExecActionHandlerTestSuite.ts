import {suite, test} from 'mocha-typescript';
import {FlowService} from '../../../../src/services';
import {ActionSnapshot} from '../../../../src/models';
import {ExecActionHandler} from '../../../../src/plugins/exec/ExecActionHandler';
import * as assert from 'assert';
import {Container} from 'typedi';
import {resolve} from 'path';

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
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await chai.expect(
            actionHandler.validate(123, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('', context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                command: 'test',
                args: '-t no'
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await chai.expect(
            actionHandler.validate({
                command: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                command: 'test',
                args: ['-t', 'no']
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                command: 'test',
                args: ['-t', 'no'],
                options: {
                    stderr: true
                }
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                command: 'test',
                assignTo: {
                    ctx: 'something'
                }
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                command: 'test',
                assignTo: {
                    secrets: 'something'
                }
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async assignToBoth(): Promise<void> {
        Container.get(FlowService).debug = true;

        const actionHandler = new ExecActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await actionHandler.execute({
            command: 'echo',
            args: ['test'],
            options: {
                stdout: true,
                stderr: true
            },
            assignTo: {
                ctx: 'tst1',
                secrets: 'tst2'
            }
        }, context, snapshot);

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, 'test\n');
        assert.strictEqual(context.ctx.tst1.stderr, '');

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, 'test\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log').payload, 'stdout: test\n');
    }

    @test()
    async assignToCtx(): Promise<void> {
        Container.get(FlowService).debug = true;

        const actionHandler = new ExecActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await actionHandler.execute({
            command: 'echo',
            args: ['test'],
            options: {
                stdout: true,
                stderr: true
            },
            assignTo: {
                ctx: 'tst1'
            }
        }, context, snapshot);

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, 'test\n');
        assert.strictEqual(context.ctx.tst1.stderr, '');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log').payload, 'stdout: test\n');
    }

    @test()
    async assignToSecrets(): Promise<void> {
        Container.get(FlowService).debug = true;

        const actionHandler = new ExecActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await actionHandler.execute({
            command: 'echo',
            args: ['test'],
            options: {
                stdout: true,
                stderr: true
            },
            assignTo: {
                secrets: 'tst2'
            }
        }, context, snapshot);

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, 'test\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'log').payload, 'stdout: test\n');
    }

    @test()
    async checkSilentStdout(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await actionHandler.execute({
            command: 'echo',
            args: ['test'],
            options: {
                stdout: true,
                stderr: true,
                silent: true
            },
            assignTo: {
                ctx: 'tst1',
                secrets: 'tst2'
            }
        }, context, snapshot);

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
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await actionHandler.execute({
            command: 'bash',
            args: [resolve(__dirname, '../../../../../test/unit/assets/echo_to_stderr.sh'), 'test'],
            options: {
                stdout: true,
                stderr: true,
                silent: true
            },
            assignTo: {
                ctx: 'tst1',
                secrets: 'tst2'
            }
        }, context, snapshot);

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
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await chai.expect(
            actionHandler.execute({
                command: 'return',
                args: ['1'],
                assignTo: {
                    ctx: 'tst1'
                }
            }, context, snapshot)
        ).to.be.rejected;

        assert.strictEqual(context.ctx.tst1.code, 1);
    }

    @test()
    async stderr(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await actionHandler.execute({
            command: 'bash',
            args: [resolve(__dirname, '../../../../../test/unit/assets/echo_to_stderr.sh'), 'test'],
            options: {
                stderr: true
            },
            assignTo: {
                ctx: 'tst1'
            }
        }, context, snapshot);

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout, '');
        assert.strictEqual(context.ctx.tst1.stderr, 'test\n');
    }

    @test()
    async missingExecutable(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await chai.expect(
            actionHandler.execute({
                command: 'missing_executable',
                assignTo: {
                    ctx: 'tst1'
                }
            }, context, snapshot)
        ).to.be.rejected;

        assert.strictEqual(context.ctx.tst1.code, -1);
    }

    @test()
    async noAssignment(): Promise<void> {
        const actionHandler = new ExecActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await chai.expect(
            actionHandler.execute({
                command: 'echo',
                args: ['test']
            }, context, snapshot)
        ).to.be.not.rejected;
    }
}
