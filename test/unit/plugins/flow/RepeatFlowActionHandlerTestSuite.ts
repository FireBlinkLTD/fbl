import {suite, test} from 'mocha-typescript';
import {ActionHandler, ActionSnapshot} from '../../../../src/models';
import {ActionHandlersRegistry, FlowService} from '../../../../src/services';
import {RepeatFlowActionHandler} from '../../../../src/plugins/flow/RepeatFlowActionHandler';
import {IActionHandlerMetadata} from '../../../../src/interfaces';
import {Container} from 'typedi';
import * as assert from 'assert';
import {ContextUtil} from '../../../../src/utils/ContextUtil';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

class DummyActionHandler extends ActionHandler {
    static ID = 'repeat.iteration.handler';

    constructor(
        private fn: Function
    ) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return  <IActionHandlerMetadata> {
            id: DummyActionHandler.ID,
            version: '1.0.0'
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        await this.fn(options, context, snapshot);
    }
}

@suite()
class RepeatFlowActionHandlerTestSuite {

    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new RepeatFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

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
            actionHandler.validate({
                times: 1
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                times: 1,
                action: []
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                times: 1,
                action: {
                    min: 1,
                    max: 2
                }
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                times: 0,
                action: {
                    min: 1
                }
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new RepeatFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate({
                times: 1,
                action: {
                    min: 1
                }
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async executeSync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new RepeatFlowActionHandler();
        actionHandlersRegistry.register(actionHandler);

        const delays = [5, 20, 10];
        const results: number[] = [];
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            await new Promise(resolve => {
                setTimeout(resolve, delays[opts.index]);
            });

            results.push(opts.index);
        });
        actionHandlersRegistry.register(dummyActionHandler);

        const options = {
            times: 3,
            action: {
                [DummyActionHandler.ID]: {
                    index: '<%- iteration.index %>'
                }
            }
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context);

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(results[0], 0);
        assert.strictEqual(results[1], 1);
        assert.strictEqual(results[2], 2);
    }

    @test()
    async executeAsync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new RepeatFlowActionHandler();
        actionHandlersRegistry.register(actionHandler);

        const delays = [5, 20, 10];
        const results: number[] = [];
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            await new Promise(resolve => {
                setTimeout(resolve, delays[opts.index]);
            });

            results.push(opts.index);
        });
        actionHandlersRegistry.register(dummyActionHandler);

        const options = {
            times: 3,
            action: {
                [DummyActionHandler.ID]: {
                    index: '<%- iteration.index %>'
                }
            },
            async: true
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context);

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(results[0], 0);
        assert.strictEqual(results[1], 2);
        assert.strictEqual(results[2], 1);
    }
}
