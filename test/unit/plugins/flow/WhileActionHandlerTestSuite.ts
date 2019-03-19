import { test, suite } from 'mocha-typescript';
import { ActionHandler, ActionSnapshot } from '../../../../src/models';
import { Container } from 'typedi';
import { ContextUtil } from '../../../../src/utils';
import { WhileActionHandler } from '../../../../src/plugins/flow/WhileActionHandler';
import { ActionHandlersRegistry, FlowService } from '../../../../src/services';
import * as assert from 'assert';
import { IActionHandlerMetadata, IContext, IPlugin, IDelegatedParameters } from '../../../../src/interfaces';
import { DummyActionHandler } from '../../fakePlugins/DummyActionHandler';

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
class WhileActionHandlerTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new WhileActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor('', context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        value: 'test',
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        value: 'test',
                        is: 'test',
                        action: {},
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        value: 'test',
                        is: 'test',
                        not: 'test',
                        action: {
                            ctx: 'yes',
                        },
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new WhileActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    value: 'test',
                    is: 'test',
                    action: {
                        ctx: 'yes',
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async checkPositiveCondition(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let count = 0;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async () => {
            count++;
            context.ctx.test = false;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new WhileActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            value: '<%- ctx.test %>',
            is: true,
            action: {
                [dummyActionHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = true;
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(count, 1);
    }

    @test()
    async checkNegativeCondition(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let count = 0;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (_options: any, _context: IContext) => {
            count++;
            _context.ctx.test = true;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new WhileActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            value: '<%- ctx.test %>',
            not: true,
            action: {
                [dummyActionHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = false;
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(count, 1);
    }

    @test()
    async skipExecution(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let count = 0;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (_options: any, _context: IContext) => {
            count++;
            _context.ctx.test = false;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new WhileActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            value: '<%- ctx.test %>',
            is: true,
            action: {
                [dummyActionHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = false;
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(count, 0);
    }

    @test()
    async failedExecution(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async () => {
            throw new Error('Test');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new WhileActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            value: '<%- ctx.test %>',
            is: true,
            action: {
                [dummyActionHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = true;
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.childFailure, true);
    }

    @test()
    async shareParameters(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new WhileActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const context = ContextUtil.generateEmptyContext();
        context.ctx.end = false;
        const parameters = <IDelegatedParameters>{
            parameters: {
                test: 1,
            },
        };

        let count = 1;
        const dummyActionHandler1 = new DummyActionHandler();
        dummyActionHandler1.executeFn = async (
            _options: any,
            _context: any,
            _snapshot: ActionSnapshot,
            _parameters: IDelegatedParameters,
        ) => {
            _parameters.parameters.test += _parameters.parameters.test;
            count++;
            context.ctx.end = count === 3;
        };
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const options = {
            shareParameters: true,
            value: '$ref:ctx.end',
            is: false,
            action: {
                [dummyActionHandler1.id]: '',
            },
        };

        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            parameters,
        );

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(parameters.parameters, {
            test: 1 + 1 + 2,
        });
    }
}
