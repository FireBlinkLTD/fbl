import { suite, test } from 'mocha-typescript';
import { TempPathsRegistry } from '../../../../src/services';
import { ActionSnapshot, EnabledActionSnapshot } from '../../../../src/models';
import { ShellActionHandler } from '../../../../src/plugins/exec/ShellActionHandler';
import * as assert from 'assert';
import { ContextUtil } from '../../../../src/utils';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { join } from 'path';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class ShellActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor('', context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        executable: 'test',
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
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    executable: 'test',
                    script: 'echo "hello!"',
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    executable: 'test',
                    script: 'echo "hello!"',
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
                    executable: 'test',
                    script: 'echo "hello!"',
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
                    executable: 'test',
                    script: 'echo "hello!"',
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
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new EnabledActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    executable: '/bin/bash',
                    script: 'echo "hello!"',
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
        assert.strictEqual(context.ctx.tst1.stdout, 'hello!\n');
        assert.strictEqual(context.ctx.tst1.stderr, '');

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, 'hello!\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(snapshot.getSteps().find((s) => s.type === 'log').payload, 'stdout: hello!\n');
    }

    @test()
    async assignResultToCtx(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new EnabledActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    executable: '/bin/bash',
                    script: 'echo "hello!"',
                    options: {
                        stdout: true,
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
        assert.strictEqual(context.ctx.tst1.stdout, 'hello!\n');
        assert.strictEqual(context.ctx.tst1.stderr, '');

        assert.strictEqual(snapshot.getSteps().find((s) => s.type === 'log').payload, 'stdout: hello!\n');
    }

    @test()
    async assignResultToSecrets(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new EnabledActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    executable: '/bin/bash',
                    script: 'echo "hello!"',
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
        assert.strictEqual(context.secrets.tst2.stdout, 'hello!\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(snapshot.getSteps().find((s) => s.type === 'log').payload, 'stdout: hello!\n');
    }

    @test()
    async checkSilentStdout(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    executable: '/bin/bash',
                    script: 'echo "hello!"',
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
        assert.strictEqual(context.ctx.tst1.stdout, 'hello!\n');
        assert.strictEqual(context.ctx.tst1.stderr, '');

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, 'hello!\n');
        assert.strictEqual(context.secrets.tst2.stderr, '');

        assert.strictEqual(
            snapshot.getSteps().find((s) => s.type === 'log'),
            undefined,
        );
    }

    @test()
    async checkSilentStderr(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    executable: '/bin/bash',
                    script: 'echo "hello!" >&2',
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
        assert.strictEqual(context.ctx.tst1.stderr, 'hello!\n');

        assert.strictEqual(context.secrets.tst2.code, 0);
        assert.strictEqual(context.secrets.tst2.stdout, '');
        assert.strictEqual(context.secrets.tst2.stderr, 'hello!\n');

        assert.strictEqual(
            snapshot.getSteps().find((s) => s.type === 'log'),
            undefined,
        );
    }

    @test()
    async checkFailure(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        executable: '/bin/bash',
                        script: 'return 1',
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
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    executable: '/bin/bash',
                    script: 'echo "hello!" >&2',
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
        assert.strictEqual(context.ctx.tst1.stderr, 'hello!\n');
    }

    @test()
    async missingExecutable(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        executable: 'missing_executable',
                        script: 'echo "hello!"',
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

        assert.strictEqual(context.ctx.tst1.code, 127);
    }

    @test()
    async noAssignmentStdout(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    executable: '/bin/bash',
                    script: 'echo "hello!"',
                },
                context,
                snapshot,
                {},
            )
            .execute();
    }

    @test()
    async noAssignmentStderr(): Promise<void> {
        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    executable: '/bin/bash',
                    script: 'echo "hello!" >&2',
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

    @test()
    async workingDirectory(): Promise<void> {
        const tempPathRegistry = TempPathsRegistry.instance;

        const actionHandler = new ShellActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const dir = await tempPathRegistry.createTempDir();
        await promisify(writeFile)(join(dir, 'a.txt'), '', 'utf8');

        await actionHandler
            .getProcessor(
                {
                    executable: '/bin/bash',
                    script: 'ls .',
                    options: {
                        stdout: true,
                        stderr: false,
                        verbose: true,
                    },
                    assignResultTo: {
                        ctx: '$.tst1',
                    },
                    wd: dir,
                },
                context,
                snapshot,
                {},
            )
            .execute();

        assert.strictEqual(context.ctx.tst1.code, 0);
        assert.strictEqual(context.ctx.tst1.stdout.trim(), 'a.txt');
        assert.strictEqual(context.ctx.tst1.stderr, '');
    }
}
