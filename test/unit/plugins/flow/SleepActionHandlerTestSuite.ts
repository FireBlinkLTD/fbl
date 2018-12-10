import {suite, test} from 'mocha-typescript';
import {ActionSnapshot} from '../../../../src/models';
import {Container} from 'typedi';
import {ContextUtil} from '../../../../src/utils';
import {SleepFlowActionHandler} from '../../../../src/plugins/flow/SleepFlowActionHandler';
import * as assert from 'assert';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class SleepActionHandlerTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new SleepFlowActionHandler();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate('355.23.23', context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('-355', context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(-1, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new SleepFlowActionHandler();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate(1, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate(0.4, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate('0.4', context, snapshot, {})
        ).to.be.not.rejected;
    }

    @test()
    async execute(): Promise<void> {
        const actionHandler = new SleepFlowActionHandler();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const start = Date.now();
        await actionHandler.execute(0.1, context, snapshot, {});
        const end = Date.now();

        assert(end - start >= 100, `Action took took ${end - start}ms, but expected to run in about 100ms.`);
    }
}
