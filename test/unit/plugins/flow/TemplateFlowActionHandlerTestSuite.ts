import {suite, test} from 'mocha-typescript';
import {ActionHandler, ActionSnapshot} from '../../../../src/models';
import {ActionHandlersRegistry, FlowService, TemplateUtilitiesRegistry} from '../../../../src/services';
import {IActionHandlerMetadata, IIteration} from '../../../../src/interfaces';
import {Container} from 'typedi';
import * as assert from 'assert';
import {TemplateFlowActionHandler} from '../../../../src/plugins/flow/TemplateFlowActionHandler';
import {ToJSONTemplateUtility} from '../../../../src/plugins/templateUtilities/ToJSONTemplateUtility';

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
        await this.fn(options, context, snapshot);
    }
}

@suite()
class TemplateFlowActionHandlerTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new TemplateFlowActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate(123, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('test', context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new TemplateFlowActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate(`
              test:
                param: true 
            `, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async execute(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const templateUtilitiesRegistry = Container.get(TemplateUtilitiesRegistry);
        const actionHandler = new TemplateFlowActionHandler();
        actionHandlersRegistry.register(actionHandler);
        templateUtilitiesRegistry.register(new ToJSONTemplateUtility());

        let actionHandlerOptions: any;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerOptions = opts;
        });
        actionHandlersRegistry.register(dummyActionHandler);

        const options = `${DummyActionHandler.ID}: <%- $.toJSON(ctx.test) %>`;

        const context = FlowService.generateEmptyContext();
        context.ctx.test = ['a1', 'b2', {
            ab: true
        }];
        const snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context);

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(actionHandlerOptions, context.ctx.test);
    }
}
