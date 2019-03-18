import { suite, test } from 'mocha-typescript';
import { ActionHandler, ActionSnapshot } from '../../../../src/models';
import * as assert from 'assert';
import { Container } from 'typedi';
import { ActionHandlersRegistry, FlowService } from '../../../../src/services';
import { ParallelFlowActionHandler } from '../../../../src/plugins/flow/ParallelFlowActionHandler';
import { IActionHandlerMetadata, IPlugin, IDelegatedParameters } from '../../../../src/interfaces';
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
export class ParallelFlowActionHandlerTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ParallelFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor('test', context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([{}], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    [
                        {
                            test1: 123,
                            test2: 321,
                        },
                    ],
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    [
                        {
                            test1: 123,
                        },
                        null,
                    ],
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ParallelFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.getProcessor([], context, snapshot, {}).validate();

        await actionHandler.getProcessor([{ test: 123 }], context, snapshot, {}).validate();
    }

    @test()
    async emptyList(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const actionHandler = new ParallelFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = <any>[];

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
    async voidAction(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const actionHandler = new ParallelFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);
        actionHandlersRegistry.register(new VoidFlowActionHandler(), plugin);

        const options = <any>['void'];

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
    async validateExecutionOrder(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler();
        dummyActionHandler1.executeFn = async (opts: any) => {
            await new Promise(resolve => setTimeout(resolve, 20));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler();
        dummyActionHandler2.executeFn = async (opts: any) => {
            await new Promise(resolve => setTimeout(resolve, 5));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const actionHandler = new ParallelFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = [{ [dummyActionHandler1.id]: 1 }, { [dummyActionHandler2.id]: 2 }];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(results[0], 2);
        assert.strictEqual(results[1], 1);
    }

    @test()
    async failureOnFirstShouldNotStopOthers(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const results: number[] = [];
        const dummyActionHandler0 = new DummyActionHandler();
        dummyActionHandler0.executeFn = async () => {
            throw new Error('Test');
        };
        actionHandlersRegistry.register(dummyActionHandler0, plugin);

        const dummyActionHandler1 = new DummyActionHandler();
        dummyActionHandler1.executeFn = async (opts: any) => {
            await new Promise(resolve => setTimeout(resolve, 20));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler();
        dummyActionHandler2.executeFn = async (opts: any) => {
            await new Promise(resolve => setTimeout(resolve, 5));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const actionHandler = new ParallelFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = [
            { [dummyActionHandler0.id]: 0 },
            { [dummyActionHandler1.id]: 1 },
            { [dummyActionHandler2.id]: 2 },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.childFailure, true);

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0], 2);
        assert.strictEqual(results[1], 1);
    }

    @test()
    async tree(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ParallelFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler();
        dummyActionHandler1.executeFn = async (opts: any) => {
            await new Promise(resolve => setTimeout(resolve, 20));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler();
        dummyActionHandler2.executeFn = async (opts: any) => {
            await new Promise(resolve => setTimeout(resolve, 5));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const dummyActionHandler3 = new DummyActionHandler();
        dummyActionHandler3.executeFn = async (opts: any) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler3, plugin);

        const options = [
            {
                '||': [{ [dummyActionHandler1.id]: 0 }, { [dummyActionHandler2.id]: '<%- iteration.index %>' }],
            },
            { [dummyActionHandler3.id]: 2 },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(results[0], 1);
        assert.strictEqual(results[1], 2);
        assert.strictEqual(results[2], 0);
    }

    @test()
    async shareParameters(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ParallelFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const parameters = <IDelegatedParameters>{
            parameters: {
                test: [],
            },
        };

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler();
        dummyActionHandler1.executeFn = async (
            _options: any,
            _context: any,
            _snapshot: ActionSnapshot,
            _parameters: IDelegatedParameters,
        ) => {
            results.push(_options);
            _parameters.parameters.test.push(_options);
        };
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler();
        dummyActionHandler2.executeFn = async (
            _options: any,
            _context: any,
            _snapshot: ActionSnapshot,
            _parameters: IDelegatedParameters,
        ) => {
            results.push(_options);
            _parameters.parameters.test.push(_options);
        };
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const options = {
            shareParameters: true,
            actions: [{ [dummyActionHandler1.id]: 0 }, { [dummyActionHandler2.id]: 1 }],
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            parameters,
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(results.length, 2);
        assert(results.indexOf(0) >= 0);
        assert(results.indexOf(1) >= 0);
        assert.strictEqual(parameters.parameters.test.length, 2);
        assert(parameters.parameters.test.indexOf(0) >= 0);
        assert(parameters.parameters.test.indexOf(1) >= 0);
    }
}
