import {suite, test} from 'mocha-typescript';
import {MultiSelectActionHandler} from '../../../../src/plugins/prompts/MultiSelectActionHandler';
import {ActionSnapshot} from '../../../../src/models';
import * as assert from 'assert';
import {ContextUtil} from '../../../../src/utils';

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
        name: name
    });
};

@suite()
class SelectActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new MultiSelectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(true, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(1234.124124, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                message: 'test',
                assignResponseTo: {
                    ctx: '$.test'
                }
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new MultiSelectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate({
                message: 'test',
                options: ['Test'],
                assignResponseTo: {
                    ctx: '$.test'
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                message: 'test',
                options: ['Test'],
                assignResponseTo: {
                    ctx: '$.test'
                },
                default: ['Test']
            }, context, snapshot, {})
        ).to.be.not.rejected;
    }

    @test()
    async confirm(): Promise<void> {
        const actionHandler = new MultiSelectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await Promise.all([
            actionHandler.execute({
                message: 'test',
                options: ['Test1', 'Test2'],
                assignResponseTo: {
                    ctx: '$.test',
                    secrets: '$.tst'
                }
            }, context, snapshot, {}),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printChar(' ', 'space');
                    printChar('\n', 'return');
                    resolve();
                }, 50);
            })
        ]);

        assert.deepStrictEqual(context.ctx.test, ['Test1']);
        assert.deepStrictEqual(context.secrets.tst, ['Test1']);

        await Promise.all([
            actionHandler.execute({
                message: 'test',
                options: ['Test1', 'Test2'],
                assignResponseTo: {
                    ctx: '$.test',
                    secrets: '$.tst'
                },
                default: ['Test2']
            }, context, snapshot, {}),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printChar(' ', 'space');
                    printChar('\n', 'return');
                    resolve();
                }, 50);
            })
        ]);

        assert.deepStrictEqual(context.ctx.test, ['Test1', 'Test2']);
        assert.deepStrictEqual(context.secrets.tst, ['Test1', 'Test2']);
    }
}
