import { suite, test } from 'mocha-typescript';
import { ActionHandler, ActionSnapshot } from '../../../../src/models';
import { ActionHandlersRegistry, FlowService } from '../../../../src/services';
import { ForEachFlowActionHandler } from '../../../../src/plugins/flow/ForEachFlowActionHandler';
import { IActionHandlerMetadata, IIteration, IPlugin, IDelegatedParameters } from '../../../../src/interfaces';
import { Container } from 'typedi';
import * as assert from 'assert';
import { ContextUtil } from '../../../../src/utils';
import { VoidFlowActionHandler } from '../../../../src/plugins/flow/VoidFlowActionHandler';
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
class ForEachFlowActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ForEachFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor('test', context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        of: 'test',
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
                        of: [1],
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
                        of: [1],
                        action: [],
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
                        of: [1],
                        action: {
                            min: 1,
                            max: 2,
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
        const actionHandler = new ForEachFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    of: [1],
                    action: {
                        min: 1,
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    of: [],
                    action: {
                        min: 1,
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    of: {},
                    action: {
                        min: 1,
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    of: {},
                    action: 'void',
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async voidAction(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);
        actionHandlersRegistry.register(new VoidFlowActionHandler(), plugin);

        const options = {
            of: [1, 2, 3],
            action: 'void',
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
    }

    @test()
    async executeArraySync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const delays = [5, 20, 10];
        const results: IIteration[] = [];
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            await new Promise(resolve => {
                setTimeout(resolve, delays[opts.index]);
            });

            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = {
            of: [1, 2, 3],
            action: {
                [dummyActionHandler.id]: {
                    index: '<%- iteration.index %>',
                    value: '<%- iteration.value %>',
                },
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results[0], { index: 0, value: 1 });
        assert.deepStrictEqual(results[1], { index: 1, value: 2 });
        assert.deepStrictEqual(results[2], { index: 2, value: 3 });
    }

    @test()
    async executeEmptyArrayAsync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            throw new Error('should not be executed');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = {
            of: <any>[],
            action: {
                [dummyActionHandler.id]: {
                    index: '<%- iteration.index %>',
                    value: '<%- iteration.value %>',
                },
            },
            async: true,
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
    }

    @test()
    async executeEmptyArraySync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            throw new Error('should not be executed');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = {
            of: <any>[],
            action: {
                [dummyActionHandler.id]: {
                    index: '<%- iteration.index %>',
                    value: '<%- iteration.value %>',
                },
            },
            async: false,
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
    }

    @test()
    async executeArrayAsync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const delays = [5, 20, 10];
        const results: IIteration[] = [];
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            await new Promise(resolve => {
                setTimeout(resolve, delays[opts.index]);
            });

            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = {
            of: [1, 2, 3],
            action: {
                [dummyActionHandler.id]: {
                    index: '<%- iteration.index %>',
                    value: '<%- iteration.value %>',
                },
            },
            async: true,
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results[0], { index: 0, value: 1 });
        assert.deepStrictEqual(results[1], { index: 2, value: 3 });
        assert.deepStrictEqual(results[2], { index: 1, value: 2 });
    }

    @test()
    async executeEmptyObjectSync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            throw new Error('should not be executed');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = {
            of: {},
            action: {
                [dummyActionHandler.id]: {
                    index: '<%- iteration.index %>',
                    key: '<%- iteration.key %>',
                    value: '<%- iteration.value %>',
                },
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
    }

    @test()
    async executeEmptyObjectAsync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            throw new Error('should not be executed');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = {
            of: {},
            action: {
                [dummyActionHandler.id]: {
                    index: '<%- iteration.index %>',
                    key: '<%- iteration.key %>',
                    value: '<%- iteration.value %>',
                },
            },
            async: true,
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
    }

    @test()
    async executeObjectSync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const delays = [5, 20, 10];
        const results: IIteration[] = [];
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            await new Promise(resolve => {
                setTimeout(resolve, delays[opts.index]);
            });

            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = {
            of: {
                a: 1,
                b: 2,
                c: 3,
            },
            action: {
                [dummyActionHandler.id]: {
                    index: '<%- iteration.index %>',
                    key: '<%- iteration.key %>',
                    value: '<%- iteration.value %>',
                },
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results[0], { index: 0, value: 1, key: 'a' });
        assert.deepStrictEqual(results[1], { index: 1, value: 2, key: 'b' });
        assert.deepStrictEqual(results[2], { index: 2, value: 3, key: 'c' });
    }

    @test()
    async executeObjectAsync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const delays = [5, 20, 10];
        const results: IIteration[] = [];
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            await new Promise(resolve => {
                setTimeout(resolve, delays[opts.index]);
            });

            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = {
            of: {
                a: 1,
                b: 2,
                c: 3,
            },
            action: {
                [dummyActionHandler.id]: {
                    index: '<%- iteration.index %>',
                    key: '<%- iteration.key %>',
                    value: '<%- iteration.value %>',
                },
            },
            async: true,
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results[0], { index: 0, value: 1, key: 'a' });
        assert.deepStrictEqual(results[1], { index: 2, value: 3, key: 'c' });
        assert.deepStrictEqual(results[2], { index: 1, value: 2, key: 'b' });
    }

    @test()
    async shareParameters(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const context = ContextUtil.generateEmptyContext();
        context.ctx.end = false;
        const parameters = <IDelegatedParameters>{
            parameters: {
                test: 1,
            },
        };

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (
            _options: any,
            _context: any,
            _snapshot: ActionSnapshot,
            _parameters: IDelegatedParameters,
        ) => {
            _parameters.parameters.test += _parameters.parameters.test * _options;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = {
            shareParameters: true,
            of: [1, 2, 3],
            action: {
                [dummyActionHandler.id]: '$ref:iteration.value',
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
            test: 2 + 2 * 2 + 6 * 3,
        });
    }
}
