import { suite, test } from 'mocha-typescript';
import { SelectActionHandler } from '../../../../src/plugins/prompts/SelectActionHandler';
import { ActionSnapshot } from '../../../../src/models';
import * as assert from 'assert';
import { ContextUtil } from '../../../../src/utils';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

/**
 * Simulate chart printing
 * @param {string} char
 * @param {string} name
 */
const printChar = (char: string, name: string): void => {
    process.stdin.emit('keypress', char, {
        ctrl: false,
        name: name,
    });
};

@suite()
class SelectActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new SelectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(true, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(1234.124124, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        message: 'test',
                        assignResponseTo: {
                            ctx: '$.test',
                        },
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        message: 'test',
                        options: [
                            {
                                title: 'Test',
                            },
                        ],
                        assignResponseTo: {
                            ctx: '$.test',
                        },
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
        const actionHandler = new SelectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    message: 'test',
                    options: ['Test'],
                    assignResponseTo: {
                        ctx: '$.test',
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
                    message: 'test',
                    options: ['Test'],
                    assignResponseTo: {
                        ctx: '$.test',
                    },
                    default: 'Test',
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    message: 'test',
                    options: [
                        {
                            title: 'Test',
                            value: 'test',
                        },
                    ],
                    assignResponseTo: {
                        ctx: '$.test',
                    },
                    default: 'Test',
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async selectWithTitlesOnly(): Promise<void> {
        const actionHandler = new SelectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        let processor = actionHandler.getProcessor(
            {
                message: 'test',
                options: ['Test1', 'Test2'],
                assignResponseTo: {
                    ctx: '$.test',
                    secrets: '$.tst',
                },
            },
            context,
            snapshot,
            {},
        );

        await Promise.all([
            processor.validate(),
            processor.execute(),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printChar('\n', 'return');
                    resolve();
                }, 50);
            }),
        ]);

        assert.strictEqual(context.ctx.test, 'Test1');
        assert.strictEqual(context.secrets.tst, 'Test1');

        processor = actionHandler.getProcessor(
            {
                message: 'test',
                options: ['Test1', 'Test2'],
                assignResponseTo: {
                    ctx: '$.test',
                    secrets: '$.tst',
                },
                pushResponseTo: {
                    ctx: '$.psh',
                },
                default: 'Test2',
            },
            context,
            snapshot,
            {},
        );

        await Promise.all([
            processor.validate(),
            processor.execute(),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printChar('\n', 'return');
                    resolve();
                }, 50);
            }),
        ]);

        assert.strictEqual(context.ctx.test, 'Test2');
        assert.strictEqual(context.secrets.tst, 'Test2');
        assert.deepStrictEqual(context.ctx.psh, ['Test2']);
    }

    @test()
    async selectWithTitlesAndValues(): Promise<void> {
        const actionHandler = new SelectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        let processor = actionHandler.getProcessor(
            {
                message: 'test',
                options: [{ title: 'Test1', value: 't1' }, { title: 'Test2', value: 't2' }],
                assignResponseTo: {
                    ctx: '$.test',
                    secrets: '$.tst',
                },
            },
            context,
            snapshot,
            {},
        );

        await Promise.all([
            processor.validate(),
            processor.execute(),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printChar('\n', 'return');
                    resolve();
                }, 50);
            }),
        ]);

        assert.strictEqual(context.ctx.test, 't1');
        assert.strictEqual(context.secrets.tst, 't1');

        processor = actionHandler.getProcessor(
            {
                message: 'test2',
                options: [{ title: 'Test3', value: 't3' }, { title: 'Test4', value: 't4' }],
                assignResponseTo: {
                    ctx: '$.test',
                    secrets: '$.tst',
                },
                pushResponseTo: {
                    ctx: '$.psh',
                },
                default: 't4',
            },
            context,
            snapshot,
            {},
        );

        await Promise.all([
            processor.validate(),
            processor.execute(),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printChar('\n', 'return');
                    resolve();
                }, 50);
            }),
        ]);

        assert.strictEqual(context.ctx.test, 't4');
        assert.strictEqual(context.secrets.tst, 't4');
        assert.deepStrictEqual(context.ctx.psh, ['t4']);
    }
}
