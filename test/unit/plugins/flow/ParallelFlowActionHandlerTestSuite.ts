import { suite, test } from 'mocha-typescript';
import { ActionHandler, ActionSnapshot } from '../../../../src/models';
import * as assert from 'assert';
import { Container } from 'typedi';
import { ActionHandlersRegistry, FlowService } from '../../../../src/services';
import { ParallelFlowActionHandler } from '../../../../src/plugins/flow/ParallelFlowActionHandler';
import { IActionHandlerMetadata, IPlugin, IDelegatedParameters } from '../../../../src/interfaces';
import { ContextUtil } from '../../../../src/utils';

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

class DummyActionHandler extends ActionHandler {
    static ID = 'parallel.handler';

    constructor(private idx: number, private delay: number, private fn: Function) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return <IActionHandlerMetadata>{
            id: DummyActionHandler.ID + '.' + this.idx,
        };
    }

    async execute(
        options: any,
        context: any,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        // wait first
        await new Promise(resolve => {
            setTimeout(resolve, this.delay);
        });

        await this.fn(options, context, snapshot, parameters);
    }
}

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

        await chai.expect(actionHandler.validate(123, context, snapshot, {})).to.be.rejected;

        await chai.expect(actionHandler.validate('test', context, snapshot, {})).to.be.rejected;

        await chai.expect(actionHandler.validate({}, context, snapshot, {})).to.be.rejected;

        await chai.expect(actionHandler.validate([], context, snapshot, {})).to.be.rejected;

        await chai.expect(actionHandler.validate([{}], context, snapshot, {})).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                [
                    {
                        test1: 123,
                        test2: 321,
                    },
                ],
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ParallelFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.validate([{ test: 123 }], context, snapshot, {})).to.be.not.rejected;
    }

    @test()
    async validateExecutionOrder(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler(1, 20, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler(2, 5, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const actionHandler = new ParallelFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = [{ [DummyActionHandler.ID + '.1']: 1 }, { [DummyActionHandler.ID + '.2']: 2 }];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(results[0], 2);
        assert.strictEqual(results[1], 1);
    }

    @test()
    async failureOnFirstShouldNotStopOthers(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const results: number[] = [];
        const dummyActionHandler0 = new DummyActionHandler(0, 0, async (opts: any) => {
            throw new Error('Test');
        });
        actionHandlersRegistry.register(dummyActionHandler0, plugin);

        const dummyActionHandler1 = new DummyActionHandler(1, 20, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler(2, 5, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const actionHandler = new ParallelFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = [
            { [DummyActionHandler.ID + '.0']: 0 },
            { [DummyActionHandler.ID + '.1']: 1 },
            { [DummyActionHandler.ID + '.2']: 2 },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

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
        const dummyActionHandler1 = new DummyActionHandler(0, 20, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler(1, 5, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const dummyActionHandler3 = new DummyActionHandler(2, 10, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler3, plugin);

        const options = [
            {
                '||': [
                    { [DummyActionHandler.ID + '.0']: 0 },
                    { [DummyActionHandler.ID + '.1']: '<%- iteration.index %>' },
                ],
            },
            { [DummyActionHandler.ID + '.2']: 2 },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(results[0], 1);
        assert.strictEqual(results[1], 2);
        assert.strictEqual(results[2], 0);
    }

    @test()
    async shareParameters(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        flowService.debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ParallelFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const parameters = <IDelegatedParameters>{
            parameters: {
                test: [],
            },
        };

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler(
            1,
            0,
            async (_options: any, _context: any, _snapshot: ActionSnapshot, _parameters: IDelegatedParameters) => {
                results.push(_options);
                _parameters.parameters.test.push(_options);
            },
        );
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler(
            2,
            0,
            async (_options: any, _context: any, _snapshot: ActionSnapshot, _parameters: IDelegatedParameters) => {
                results.push(_options);
                _parameters.parameters.test.push(_options);
            },
        );
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const options = {
            shareParameters: true,
            actions: [{ [DummyActionHandler.ID + '.1']: 0 }, { [DummyActionHandler.ID + '.2']: 1 }],
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            '.',
            actionHandler.getMetadata().id,
            {},
            options,
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
