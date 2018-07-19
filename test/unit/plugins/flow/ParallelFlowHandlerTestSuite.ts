import {suite, test} from 'mocha-typescript';
import {ActionHandler, ActionSnapshot, IHandlerMetadata} from '../../../../src/models';
import * as assert from 'assert';
import {Container} from 'typedi';
import {ActionHandlersRegistry, FlowService} from '../../../../src/services';
import {ParallelFlowHandler} from '../../../../src/plugins/flow/ParallelFlowHandler';
import {IContext} from '../../../../src/interfaces';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

class DummyActionHandler extends ActionHandler {
    static ID = 'parallel.handler';

    constructor(
        private idx: number,
        private delay: number,
        private fn: Function
    ) {
        super();
    }

    getMetadata(): IHandlerMetadata {
        return  <IHandlerMetadata> {
            id: DummyActionHandler.ID + '.' + this.idx,
            version: '1.0.0'
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        // wait first
        await new Promise(resolve => {
            setTimeout(resolve, this.delay);
        });

        await this.fn(options, context, snapshot);
    }
}

@suite()
export class ParallelFlowHandlerTestSuite {

    after() {
        Container.remove(FlowService);

        Container
            .get<ActionHandlersRegistry>(ActionHandlersRegistry)
            .unregister(new ParallelFlowHandler().getMetadata().id)
            .unregister(DummyActionHandler.ID + '.0')
            .unregister(DummyActionHandler.ID + '.1')
            .unregister(DummyActionHandler.ID + '.2');
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ParallelFlowHandler();

        const context = <IContext> {
            ctx: {}
        };

        const snapshot = new ActionSnapshot('.', '');
        
        await chai.expect(
            actionHandler.validate(123, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('test', context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([{}], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([{
                test1: 123,
                test2: 321
            }], context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ParallelFlowHandler();

        const context = <IContext> {
            ctx: {}
        };

        const snapshot = new ActionSnapshot('.', '');

        await chai.expect(
            actionHandler.validate([
                {test: 123}
            ], context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async validateExecutionOrder(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler(1, 20, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler1);

        const dummyActionHandler2 = new DummyActionHandler(2, 5, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler2);

        const actionHandler = new ParallelFlowHandler();

        const options = [
            {[DummyActionHandler.ID + '.1']: 1},
            {[DummyActionHandler.ID + '.2']: 2},
        ];

        const context = <IContext> {
            ctx: {}
        };

        const snapshot = new ActionSnapshot('.', '');

        await chai.expect(
            actionHandler.validate(options, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context, snapshot)
        ).to.be.not.rejected;

        assert.strictEqual(results[0], 2);
        assert.strictEqual(results[1], 1);
    }

    @test()
    async failureOnFirstShouldNotStopOthers(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const results: number[] = [];
        const dummyActionHandler0 = new DummyActionHandler(0, 0, async (opts: any) => {
            throw new Error('Test');
        });
        actionHandlersRegistry.register(dummyActionHandler0);

        const dummyActionHandler1 = new DummyActionHandler(1, 20, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler1);

        const dummyActionHandler2 = new DummyActionHandler(2, 5, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler2);

        const actionHandler = new ParallelFlowHandler();

        const options = [
            {[DummyActionHandler.ID + '.0']: 0},
            {[DummyActionHandler.ID + '.1']: 1},
            {[DummyActionHandler.ID + '.2']: 2},
        ];

        const context = <IContext> {
            ctx: {}
        };

        const snapshot = new ActionSnapshot('.', '');

        await chai.expect(
            actionHandler.validate(options, context, snapshot)
        ).to.be.not.rejected;

        await actionHandler.execute(options, context, snapshot);

        assert.strictEqual(snapshot.childFailure, true);

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0], 2);
        assert.strictEqual(results[1], 1);
    }

    @test()
    async tree(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ParallelFlowHandler();
        actionHandlersRegistry.register(actionHandler);

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler(1, 20, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler1);

        const dummyActionHandler2 = new DummyActionHandler(2, 5, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler2);

        const options = [
            {
                '||': [
                    {[DummyActionHandler.ID + '.1']: 1},
                ]
            },
            {[DummyActionHandler.ID + '.2']: 2},
        ];

        const context = <IContext> {
            ctx: {}
        };

        const snapshot = new ActionSnapshot('.', '');

        await chai.expect(
            actionHandler.validate(options, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context, snapshot)
        ).to.be.not.rejected;

        assert.strictEqual(results[0], 2);
        assert.strictEqual(results[1], 1);
    }
}
