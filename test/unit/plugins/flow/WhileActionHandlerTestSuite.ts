import {test, suite} from 'mocha-typescript';
import {ActionHandler, ActionSnapshot} from '../../../../src/models';
import {Container} from 'typedi';
import {ContextUtil} from '../../../../src/utils';
import {WhileActionHandler} from '../../../../src/plugins/flow/WhileActionHandler';
import {ActionHandlersRegistry, FlowService} from '../../../../src/services';
import * as assert from 'assert';
import {IActionHandlerMetadata, IContext, IPlugin} from '../../../../src/interfaces';

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
    static ID = 'while.handler';

    constructor(
        private fn: Function
    ) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return  <IActionHandlerMetadata> {
            id: DummyActionHandler.ID
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        await this.fn(options, context, snapshot, {});
    }
}

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

        await chai.expect(
            actionHandler.validate(123, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('', context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'test'
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'test',
                is: 'test',
                action: 'test'
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'test',
                is: 'test',
                not: 'test',
                action: {
                    'ctx': 'yes'
                }
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new WhileActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate({
                value: 'test',
                is: 'test',
                action: {
                    'ctx': 'yes'
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;
    }

    @test()
    async checkPositiveCondition(): Promise<void> {
        const flowService = Container.get(FlowService);
        flowService.debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let count = 0;
        const dummyActionHandler = new DummyActionHandler(async (_options: any, _context: IContext) => {
            count++;
            context.ctx.test = false;
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new WhileActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            value: '<%- ctx.test %>',
            is: true,
            action: {
                [DummyActionHandler.ID]: {}
            }
        };

        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = true;
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(count, 1);
    }

    @test()
    async checkNegativeCondition(): Promise<void> {
        const flowService = Container.get(FlowService);
        flowService.debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let count = 0;
        const dummyActionHandler = new DummyActionHandler(async (_options: any, _context: IContext) => {
            count++;
            _context.ctx.test = true;
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new WhileActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            value: '<%- ctx.test %>',
            not: true,
            action: {
                [DummyActionHandler.ID]: {}
            }
        };


        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = false;
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(count, 1);
    }

    @test()
    async skipExecution(): Promise<void> {
        const flowService = Container.get(FlowService);
        flowService.debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let count = 0;
        const dummyActionHandler = new DummyActionHandler(async (_options: any, _context: IContext) => {
            count++;
            _context.ctx.test = false;
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new WhileActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            value: '<%- ctx.test %>',
            is: true,
            action: {
                [DummyActionHandler.ID]: {}
            }
        };


        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = false;
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(count, 0);
    }

    @test()
    async failedExecution(): Promise<void> {
        const flowService = Container.get(FlowService);
        flowService.debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler(async () => {
            throw new Error('Test');
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new WhileActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            value: '<%- ctx.test %>',
            is: true,
            action: {
                [DummyActionHandler.ID]: {}
            }
        };


        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = true;
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.childFailure, true);
    }
}
