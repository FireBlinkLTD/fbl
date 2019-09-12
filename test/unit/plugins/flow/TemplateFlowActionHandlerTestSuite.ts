import { suite, test } from 'mocha-typescript';
import { ActionSnapshot } from '../../../../src/models';
import { ActionHandlersRegistry, FlowService } from '../../../../src/services';
import { IPlugin } from '../../../../src/interfaces';
import { Container } from 'typedi';
import * as assert from 'assert';
import { TemplateFlowActionHandler } from '../../../../src/plugins/flow/TemplateFlowActionHandler';
import { ContextUtil } from '../../../../src/utils';
import { DummyActionHandler } from '../../../assets/fakePlugins/DummyActionHandler';

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

@suite()
class TemplateFlowActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new TemplateFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(`{}`, context, snapshot, {}).validate()).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new TemplateFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler.getProcessor('test:' + '\n  param: true', context, snapshot, {}).validate();
    }

    @test()
    async execute(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new TemplateFlowActionHandler();

        actionHandlersRegistry.register(actionHandler, plugin);

        let actionHandlerOptions: any;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            actionHandlerOptions = opts;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = `${dummyActionHandler.id}: $ref:ctx.test`;

        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = [
            'a1',
            'b2',
            {
                ab: true,
            },
        ];
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(actionHandlerOptions, context.ctx.test);
    }
}
