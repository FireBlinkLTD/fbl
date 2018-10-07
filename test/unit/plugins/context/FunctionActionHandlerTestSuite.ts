import {suite, test} from 'mocha-typescript';
import {FunctionActionHandler} from '../../../../src/plugins/context/FunctionActionHandler';
import {ContextUtil} from '../../../../src/utils';
import {ActionSnapshot} from '../../../../src/models';
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
        const snapshot = new ActionSnapshot('.', {}, '', 0);

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
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new FunctionActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate('console.log(1);', context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async exec(): Promise<void> {
        const actionHandler = new FunctionActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await actionHandler.execute('context.ctx.test = 1;', context, snapshot);

        assert.deepStrictEqual(context.ctx, { test: 1 });
    }
}
