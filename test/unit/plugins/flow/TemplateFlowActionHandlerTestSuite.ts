import { suite, test } from 'mocha-typescript';
import { ActionHandler, ActionSnapshot } from '../../../../src/models';
import { ActionHandlersRegistry, FlowService, TemplateUtilitiesRegistry } from '../../../../src/services';
import { IActionHandlerMetadata, IPlugin } from '../../../../src/interfaces';
import { Container } from 'typedi';
import * as assert from 'assert';
import { TemplateFlowActionHandler } from '../../../../src/plugins/flow/TemplateFlowActionHandler';
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
    static ID = 'repeat.foreach.handler';

    constructor(private fn: Function) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return <IActionHandlerMetadata>{
            id: DummyActionHandler.ID,
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        await this.fn(options, context, snapshot, {});
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
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.validate(123, context, snapshot, {})).to.be.rejected;

        await chai.expect(actionHandler.validate([], context, snapshot, {})).to.be.rejected;

        await chai.expect(actionHandler.validate(`{}`, context, snapshot, {})).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new TemplateFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate(
                `
              test:
                param: true 
            `,
                context,
                snapshot,
                {},
            ),
        ).to.be.not.rejected;
    }

    @test()
    async execute(): Promise<void> {
        const flowService: FlowService = Container.get<FlowService>(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const actionHandler = new TemplateFlowActionHandler();

        actionHandlersRegistry.register(actionHandler, plugin);

        let actionHandlerOptions: any;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerOptions = opts;
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const options = `${DummyActionHandler.ID}: $ref:ctx.test`;

        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = [
            'a1',
            'b2',
            {
                ab: true,
            },
        ];
        const snapshot = await flowService.executeAction(
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.deepStrictEqual(actionHandlerOptions, context.ctx.test);
    }
}
