import {suite, test} from 'mocha-typescript';
import {SequenceFlowHandler} from '../../../../src/plugins/flow/SequenceFlowHandler';
import {ActionHandler, IHandlerMetadata} from '../../../../src/models';
import {Container} from 'typedi';
import {ActionHandlersRegistry} from '../../../../src/services';
import * as assert from 'assert';
import {IContext} from '../../../../src/interfaces';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

class DummyActionHandler extends ActionHandler {
    static ID = 'sequence.handler';

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

    async execute(options: any, context: any): Promise<void> {
        // wait first
        await new Promise(resolve => {
           setTimeout(resolve, this.delay);
        });

        await this.fn(options, context);
    }
}

@suite
export class SequenceFlowHandlerTestSuite {

    after() {
        Container
            .get<ActionHandlersRegistry>(ActionHandlersRegistry)
            .unregister(new SequenceFlowHandler().getMetadata().id)
            .unregister(DummyActionHandler.ID + '.0')
            .unregister(DummyActionHandler.ID + '.1')
            .unregister(DummyActionHandler.ID + '.2');
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new SequenceFlowHandler();

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };
        
        await chai.expect(
            actionHandler.validate(123, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('test', context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([{}], context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([{
                test1: 123,
                test2: 321
            }], context)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new SequenceFlowHandler();

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };

        await chai.expect(
            actionHandler.validate([
                {test: 123}
            ], context)
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

        const actionHandler = new SequenceFlowHandler();

        const options = [
            {[DummyActionHandler.ID + '.1']: 1},
            {[DummyActionHandler.ID + '.2']: 2},
        ];

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };

        await chai.expect(
            actionHandler.validate(options, context)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context)
        ).to.be.not.rejected;

        assert.strictEqual(results[0], 1);
        assert.strictEqual(results[1], 2);
    }

    @test()
    async shouldFailAfterFirstError(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const results: number[] = [];
        const dummyActionHandler1 = new DummyActionHandler(1, 20, async (opts: any) => {
            throw new Error('Test');
        });
        actionHandlersRegistry.register(dummyActionHandler1);

        const dummyActionHandler2 = new DummyActionHandler(2, 5, async (opts: any) => {
            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler2);

        const actionHandler = new SequenceFlowHandler();

        const options = [
            {[DummyActionHandler.ID + '.1']: 1},
            {[DummyActionHandler.ID + '.2']: 2},
        ];

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };

        await chai.expect(
            actionHandler.validate(options, context)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context)
        ).to.be.rejected;

        assert.strictEqual(results.length, 0);
    }

    @test()
    async tree(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new SequenceFlowHandler();
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
              '--': [
                  {[DummyActionHandler.ID + '.1']: 1},
              ]
            },
            {[DummyActionHandler.ID + '.2']: 2},
        ];

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };

        await chai.expect(
            actionHandler.validate(options, context)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context)
        ).to.be.not.rejected;

        assert.strictEqual(results[0], 1);
        assert.strictEqual(results[1], 2);
    }
}