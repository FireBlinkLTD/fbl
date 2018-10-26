import {suite, test} from 'mocha-typescript';
import {ConfirmActionHandler} from '../../../../src/plugins/prompts/ConfirmActionHandler';
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

/**
 * Simulate line printing
 * @param {string} chars
 */
const printLine = (chars: string): void => {
    for (let i = 0; i < 100; i++) {
        printChar('', 'backspace');
    }

    for (const char of chars) {
        printChar(char, char);
    }

    printChar('\n', 'return');
};

@suite()
class ConfirmActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ConfirmActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(true, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(1234.124124, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                message: 'test',
                assignResponseTo: {
                    ctx: '$.test'
                },
                default: 'str'
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ConfirmActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate({
                message: 'test',
                assignResponseTo: {
                    ctx: '$.test'
                }
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                message: 'test',
                assignResponseTo: {
                    ctx: '$.test'
                },
                default: true
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async confirm(): Promise<void> {
        const actionHandler = new ConfirmActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await Promise.all([
            actionHandler.execute({
                message: 'test',
                assignResponseTo: {
                    ctx: '$.test',
                    secrets: '$.tst'
                }
            }, context, snapshot),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printLine('y');
                    resolve();
                }, 50);
            })
        ]);

        assert.strictEqual(context.ctx.test, true);
        assert.strictEqual(context.secrets.tst, true);
    }
}
