import { test, suite } from 'mocha-typescript';
import { ActionSnapshot } from '../../../../src/models';
import { ContextUtil } from '../../../../src/utils';
import { ErrorActionHandler } from '../../../../src/plugins/flow/ErrorActionHandler';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite
class ErrorActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ErrorActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(1, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ErrorActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        actionHandler.getProcessor('message', context, snapshot, {}).validate();
    }

    @test()
    async execution(): Promise<void> {
        const actionHandler = new ErrorActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const processor = actionHandler.getProcessor('test', context, snapshot, {});
        await processor.validate();
        await chai.expect(processor.execute()).to.be.rejectedWith('test');
    }
}
