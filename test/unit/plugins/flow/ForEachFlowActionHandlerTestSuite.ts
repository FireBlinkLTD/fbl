import {suite, test} from 'mocha-typescript';
import {ActionHandler, ActionSnapshot} from '../../../../src/models';
import {ActionHandlersRegistry, FlowService} from '../../../../src/services';
import {ForEachFlowActionHandler} from '../../../../src/plugins/flow/ForEachFlowActionHandler';
import {IActionHandlerMetadata, IIteration} from '../../../../src/interfaces';
import {Container} from 'typedi';
import * as assert from 'assert';
import {ContextUtil} from '../../../../src/utils';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

class DummyActionHandler extends ActionHandler {
    static ID = 'repeat.foreach.handler';

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
        await this.fn(options, context, snapshot, {});
    }
}

@suite()
class ForEachFlowActionHandlerTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ForEachFlowActionHandler();
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
            actionHandler.validate({
                of: 'test'
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                of: [1]
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                of: [1],
                action: []
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                of: [1],
                action: {
                    min: 1,
                    max: 2
                }
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ForEachFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate({
                of: [1],
                action: {
                    min: 1
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;
    }

    @test()
    async executeArraySync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler);

        const delays = [5, 20, 10];
        const results: IIteration[] = [];
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            await new Promise(resolve => {
                setTimeout(resolve, delays[opts.index]);
            });

            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler);

        const options = {
            of: [1, 2, 3],
            action: {
                [DummyActionHandler.ID]: {
                    index: '<%- iteration.index %>',
                    value: '<%- iteration.value %>'
                }
            }
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results[0], {index: 0, value: 1});
        assert.deepStrictEqual(results[1], {index: 1, value: 2});
        assert.deepStrictEqual(results[2], {index: 2, value: 3});
    }

    @test()
    async executeArrayAsync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler);

        const delays = [5, 20, 10];
        const results: IIteration[] = [];
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            await new Promise(resolve => {
                setTimeout(resolve, delays[opts.index]);
            });

            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler);

        const options = {
            of: [1, 2, 3],
            action: {
                [DummyActionHandler.ID]: {
                    index: '<%- iteration.index %>',
                    value: '<%- iteration.value %>'
                }
            },
            async: true
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results[0], {index: 0, value: 1});
        assert.deepStrictEqual(results[1], {index: 2, value: 3});
        assert.deepStrictEqual(results[2], {index: 1, value: 2});
    }

    @test()
    async executeObjectSync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler);

        const delays = [5, 20, 10];
        const results: IIteration[] = [];
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            await new Promise(resolve => {
                setTimeout(resolve, delays[opts.index]);
            });

            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler);

        const options = {
            of: {
                a: 1,
                b: 2,
                c: 3
            },
            action: {
                [DummyActionHandler.ID]: {
                    index: '<%- iteration.index %>',
                    name: '<%- iteration.name %>',
                    value: '<%- iteration.value %>'
                }
            }
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results[0], {index: 0, value: 1, name: 'a'});
        assert.deepStrictEqual(results[1], {index: 1, value: 2, name: 'b'});
        assert.deepStrictEqual(results[2], {index: 2, value: 3, name: 'c'});
    }

    @test()
    async executeObjectAsync(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new ForEachFlowActionHandler();
        actionHandlersRegistry.register(actionHandler);

        const delays = [5, 20, 10];
        const results: IIteration[] = [];
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            await new Promise(resolve => {
                setTimeout(resolve, delays[opts.index]);
            });

            results.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler);

        const options = {
            of: {
                a: 1,
                b: 2,
                c: 3
            },
            action: {
                [DummyActionHandler.ID]: {
                    index: '<%- iteration.index %>',
                    name: '<%- iteration.name %>',
                    value: '<%- iteration.value %>'
                }
            },
            async: true
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(results[0], {index: 0, value: 1, name: 'a'});
        assert.deepStrictEqual(results[1], {index: 2, value: 3, name: 'c'});
        assert.deepStrictEqual(results[2], {index: 1, value: 2, name: 'b'});
    }
}
