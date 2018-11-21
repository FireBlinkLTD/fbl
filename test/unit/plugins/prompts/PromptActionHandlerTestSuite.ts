import {suite, test} from 'mocha-typescript';
import {PromptActionHandler} from '../../../../src/plugins/prompts/PromptActionHandler';
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
 * @param {boolean} [ctrl]
 */
const printChar = (char: string, name: string, ctrl = false): void => {
    process.stdin.emit('keypress', char, {
        ctrl,
        name
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
class PromptActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new PromptActionHandler();
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
                },
                schema: {}
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                message: 'test',
                assignResponseTo: {
                    ctx: '$.test'
                },
                schema: {
                    type: 'object' // not valid type
                }
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new PromptActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate({
                message: 'test',
                assignResponseTo: {
                    ctx: '$.test'
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                message: 'test',
                assignResponseTo: {
                    ctx: '$.test'
                },
                schema: {
                    type: 'number'
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                message: 'test',
                assignResponseTo: {
                    ctx: '$.test'
                },
                schema: {
                    type: 'string',
                    minLength: 10
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;
    }

    @test()
    async testDefaults(): Promise<void> {
        const actionHandler = new PromptActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const line = 'l1n3';

        await Promise.all([
            actionHandler.execute({
                message: 'test',
                assignResponseTo: {
                    ctx: '$.test'
                }
            }, context, snapshot, {}),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printLine(line);
                    resolve();
                }, 50);
            })
        ]);

        assert.strictEqual(context.ctx.test, line);
    }

    @test()
    async testNumber(): Promise<void> {
        const actionHandler = new PromptActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const line = '344.53';

        await Promise.all([
            actionHandler.execute({
                message: 'test',
                password: true,
                default: 100,
                schema: {
                    type: 'number',
                    minimum: 344,
                    maximum: 345
                },
                assignResponseTo: {
                    secrets: '$.test'
                }
            }, context, snapshot, {}),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printLine(line);
                    resolve();
                }, 50);
            })
        ]);

        assert.strictEqual(context.secrets.test, 344.53);
    }

    @test()
    async testInteger(): Promise<void> {
        const actionHandler = new PromptActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const line = '344';

        await Promise.all([
            actionHandler.execute({
                message: 'test',
                password: true,
                default: 100,
                schema: {
                    type: 'integer',
                    minimum: 343,
                    maximum: 345
                },
                assignResponseTo: {
                    secrets: '$.test'
                }
            }, context, snapshot, {}),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printLine(line);
                    resolve();
                }, 50);
            })
        ]);

        assert.strictEqual(context.secrets.test, 344);
    }

    @test()
    async testStringWithValidation(): Promise<void> {
        const actionHandler = new PromptActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const invalid = 'test';
        const correct = 'tst';

        await Promise.all([
            actionHandler.execute({
                message: 'test',
                password: true,
                default: 100,
                schema: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 5,
                    pattern: '^tst$'
                },
                assignResponseTo: {
                    secrets: '$.test'
                },
                pushResponseTo: {
                    ctx: '$.psh'
                }
            }, context, snapshot, {}),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printLine(invalid);
                    setTimeout(() => {
                        printLine(correct);
                        resolve();
                    }, 50);
                }, 50);
            })
        ]);

        assert.strictEqual(context.secrets.test, correct);
        assert.deepStrictEqual(context.ctx.psh, [correct]);
    }

    @test()
    async cancelled(): Promise<void> {
        const actionHandler = new PromptActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await Promise.all([
            chai.expect(
                actionHandler.execute({
                    message: 'test',
                    assignResponseTo: {
                        ctx: '$.test'
                    }
                }, context, snapshot, {})
            ).to.be.rejectedWith(
                'Prompt canceled by user'
            ),
            new Promise<void>(resolve => {
                setTimeout(() => {
                    printChar('c', 'c', true);
                    resolve();
                }, 50);
            })
        ]);
    }
}
