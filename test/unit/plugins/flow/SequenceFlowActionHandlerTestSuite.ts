import { suite, test } from 'mocha-typescript';
import { SequenceFlowActionHandler } from '../../../../src/plugins/flow/SequenceFlowActionHandler';
import { ActionSnapshot } from '../../../../src/models';
import { ActionHandlersRegistry, FlowService } from '../../../../src/services';
import * as assert from 'assert';
import { IPlugin, IDelegatedParameters } from '../../../../src/interfaces';
import { ContextUtil } from '../../../../src/utils';
import { VoidFlowActionHandler } from '../../../../src/plugins/flow/VoidFlowActionHandler';
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

@suite
export class SequenceFlowActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new SequenceFlowActionHandler();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

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
        const actionHandler = new SequenceFlowActionHandler();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler.getProcessor([{ test: 123 }], context, snapshot, {}).validate();

        await actionHandler.getProcessor([], context, snapshot, {}).validate();
    }

    @test()
    async voidAction(): Promise<void> {
        const flowService: FlowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        const actionHandler = new SequenceFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);
        actionHandlersRegistry.register(new VoidFlowActionHandler(), plugin);

        const options = <any>['void'];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
    }

    @test()
    async emptyList(): Promise<void> {
        const flowService: FlowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        const actionHandler = new SequenceFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = <any>[];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
    }

    @test()
    async validateExecutionOrder(): Promise<void> {
        const flowService: FlowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler();
        dummyActionHandler1.executeFn = async (opts: any) => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler();
        dummyActionHandler2.executeFn = async (opts: any) => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const actionHandler = new SequenceFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = [{ [dummyActionHandler1.id]: 1 }, { [dummyActionHandler2.id]: 2 }];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results, [1, 2]);
    }

    @test()
    async shouldStopAfterFirstError(): Promise<void> {
        const flowService: FlowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler();
        dummyActionHandler1.executeFn = async (opts: any) => {
            throw new Error('test');
        };
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler();
        dummyActionHandler2.executeFn = async (opts: any) => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const actionHandler = new SequenceFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = [{ [dummyActionHandler1.id]: 1 }, { [dummyActionHandler2.id]: 2 }];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(results.length, 0);
    }

    @test()
    async tree(): Promise<void> {
        const flowService: FlowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;
        const actionHandler = new SequenceFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler();
        dummyActionHandler1.executeFn = async (opts: any) => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler();
        dummyActionHandler2.executeFn = async (opts: any) => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const options = [
            {
                '--': [{ [dummyActionHandler1.id]: 0 }],
            },
            { [dummyActionHandler2.id]: '<%- iteration.index %>' },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results, [0, 1]);
    }

    @test()
    async shareParameters(): Promise<void> {
        const flowService: FlowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;
        const actionHandler = new SequenceFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler();
        dummyActionHandler1.executeFn = async (
            _options: any,
            _context: any,
            _snapshot: ActionSnapshot,
            _parameters: IDelegatedParameters,
        ) => {
            results.push(_options);
            _parameters.parameters.test = 1;
        };
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler();
        dummyActionHandler2.executeFn = async (opts: any) => {
            results.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const options = {
            shareParameters: true,
            actions: [{ [dummyActionHandler1.id]: 0 }, { [dummyActionHandler2.id]: '<%- parameters.test %>' }],
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {
                parameters: {},
            },
        );

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results, [0, 1]);
    }
}
