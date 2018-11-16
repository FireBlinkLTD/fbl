import {suite, test} from 'mocha-typescript';
import {SequenceFlowActionHandler} from '../../../../src/plugins/flow/SequenceFlowActionHandler';
import {ActionHandler, ActionSnapshot} from '../../../../src/models';
import {Container} from 'typedi';
import {ActionHandlersRegistry, FlowService} from '../../../../src/services';
import * as assert from 'assert';
import {IActionHandlerMetadata, IPlugin} from '../../../../src/interfaces';
import {ContextUtil} from '../../../../src/utils';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const plugin: IPlugin = {
    name: 'test',
    version: '1.0.0',
    requires: {
        fbl: '>=0.0.0'
    }
};

class DummyActionHandler extends ActionHandler {
    static ID = 'sequence.handler';

    constructor(
        private idx: number,
        private delay: number,
        private fn: Function
    ) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return  <IActionHandlerMetadata> {
            id: DummyActionHandler.ID + '.' + this.idx
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        // wait first
        await new Promise(resolve => {
           setTimeout(resolve, this.delay);
        });

        await this.fn(options, context, snapshot, {});
    }
}

@suite
export class SequenceFlowActionHandlerTestSuite {

    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new SequenceFlowActionHandler();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        
        await chai.expect(
            actionHandler.validate(123, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('test', context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([{}], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([{
                test1: 123,
                test2: 321
            }], context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new SequenceFlowActionHandler();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate([
                {test: 123}
            ], context, snapshot, {})
        ).to.be.not.rejected;
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

        const actionHandler = new SequenceFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = [
            {[DummyActionHandler.ID + '.1']: 1},
            {[DummyActionHandler.ID + '.2']: 2},
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(results[0], 1);
        assert.strictEqual(results[1], 2);
    }

    @test()
    async shouldStopAfterFirstError(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler(1, 20, async (opts: any) => {
            throw new Error('Test');
        });
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler(2, 5, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const actionHandler = new SequenceFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = [
            {[DummyActionHandler.ID + '.1']: 1},
            {[DummyActionHandler.ID + '.2']: 2},
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(results.length, 0);
    }

    @test()
    async tree(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new SequenceFlowActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler(1, 20, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler1, plugin);

        const dummyActionHandler2 = new DummyActionHandler(2, 5, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler2, plugin);

        const options = [
            {
              '--': [
                  {[DummyActionHandler.ID + '.1']: 0},
              ]
            },
            {[DummyActionHandler.ID + '.2']: '<%- iteration.index %>'},
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(results[0], 0);
        assert.strictEqual(results[1], 1);
    }
}
