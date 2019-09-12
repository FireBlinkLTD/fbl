import { suite, test } from 'mocha-typescript';
import { FunctionActionHandler } from '../../../../src/plugins/exec/FunctionActionHandler';
import { ContextUtil } from '../../../../src/utils';
import { ActionSnapshot } from '../../../../src/models';
import * as assert from 'assert';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class FunctionActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new FunctionActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor('', context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new FunctionActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler.getProcessor('console.log(1);', context, snapshot, {}).validate();
    }

    @test()
    async exec(): Promise<void> {
        const actionHandler = new FunctionActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor('ctx.test = parameters.t1 + iteration.value;', context, snapshot, {
                parameters: {
                    t1: 1,
                },
                iteration: {
                    index: 0,
                    value: 2,
                },
            })
            .execute();

        assert.deepStrictEqual(context.ctx, { test: 3 });
    }

    @test()
    async execResultOverride(): Promise<void> {
        const actionHandler = new FunctionActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const fn = [
            'return {',
            '  ctx: {test: parameters.t1 + iteration.value},',
            '  secrets: {a: true},',
            '  cwd: "/test",',
            '  entities: {registered: [{type: "Test", id: 0}]},',
            '  parameters: {p: 123},',
            '  iteration: {index: 0},',
            '}',
        ].join('\n');

        const parameters = {
            parameters: {
                t1: 1,
            },
            iteration: {
                index: 0,
                value: 2,
            },
        };

        await actionHandler.getProcessor(fn, context, snapshot, parameters).execute();

        assert.deepStrictEqual(context.cwd, '/test');
        assert.deepStrictEqual(context.ctx, { test: 3 });
        assert.deepStrictEqual(context.secrets, { a: true });
        assert.deepStrictEqual(context.entities, { registered: [{ type: 'Test', id: 0 }] });
        assert.deepStrictEqual(parameters.parameters, { p: 123 });
        assert.deepStrictEqual(parameters.iteration, { index: 0 });
    }

    @test()
    async failValidationOfResultOverride(): Promise<void> {
        const actionHandler = new FunctionActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const fn = ['return {', '  ctx: true,', '}'].join('\n');

        const parameters = {
            parameters: {
                t1: 1,
            },
            iteration: {
                index: 0,
                value: 2,
            },
        };

        await chai.expect(actionHandler.getProcessor(fn, context, snapshot, parameters).execute()).to.be.rejected;
    }
}
