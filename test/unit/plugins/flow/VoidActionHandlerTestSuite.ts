import { test, suite } from 'mocha-typescript';
import { ActionSnapshot } from '../../../../src/models';
import { ContextUtil } from '../../../../src/utils';
import { VoidFlowActionHandler } from '../../../../src/plugins/flow/VoidFlowActionHandler';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class VoidActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new VoidFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;
        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;
        await chai.expect(actionHandler.getProcessor(0, context, snapshot, {}).validate()).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new VoidFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        actionHandler.getProcessor(undefined, context, snapshot, {}).validate();
    }

    @test()
    async execute(): Promise<void> {
        const actionHandler = new VoidFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler.getProcessor(undefined, context, snapshot, {}).execute();
    }
}
