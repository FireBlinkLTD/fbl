import { test, suite } from 'mocha-typescript';
import { ActionSnapshot } from '../../../../src/models';
import { ContextUtil } from '../../../../src/utils';
import { InvokeActionHandler } from '../../../../src/plugins/flow/InvokeActionHandler';
import Container from 'typedi';
import { ActionHandlersRegistry, IPlugin } from '../../../../src';
import { DummyActionHandler } from '../../../assets/fakePlugins/DummyActionHandler';
import { strictEqual } from 'assert';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const plugin: IPlugin = {
    name: 'test',
    version: '1.0.0',
    requires: {
        fbl: '>=0.0.0',
    },
};

@suite
class InvokeActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new InvokeActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(1, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new InvokeActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        actionHandler.getProcessor('action', context, snapshot, {}).validate();
    }

    @test()
    async execution(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler();
        let result = false;
        dummyActionHandler.executeFn = async () => {
            result = true;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new InvokeActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(
            {
                [dummyActionHandler.getMetadata().id]: {},
            },
            context,
            snapshot,
            {},
        );

        await processor.validate();
        await processor.execute();

        strictEqual(result, true);
    }
}
