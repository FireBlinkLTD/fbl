import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { VirtualFlowActionHandler } from '../../../../src/plugins/flow/VirtualFlowActionHandler';
import { ActionHandlersRegistry, IPlugin, TemplateUtilitiesRegistry, ContextUtil, FlowService } from '../../../../src';
import { ContextTemplateUtility } from '../../../../src/plugins/templateUtilities/ContextTemplateUtility';
import { FunctionActionHandler } from '../../../../src/plugins/exec/FunctionActionHandler';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class ContextTemplateUtilityTestSuite {
    @test()
    async defineVirtual() {
        const virtualDefinitionFlow = {
            id: 'test',
            parametersSchema: {
                type: 'object',
                properties: {
                    assignTo: '<%- JSON.stringify($.assignToSchema()) %>',
                    pushTo: '<%- JSON.stringify($.pushToSchema()) %>',
                },
            },
            action: {
                fn: `
                    $.assignTo(parameters.assignTo, 'assignToValue');
                    $.pushTo(parameters.pushTo, 'pushToValue');

                    // should not cause errors, but just have no effect:
                    $.pushTo(undefined, 'pv');
                    $.assignTo(null, 'av');
                `,
            },
        };

        const flowService = FlowService.instance;
        const templateUtilitiesRegistry = TemplateUtilitiesRegistry.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        actionHandlersRegistry.register(new VirtualFlowActionHandler(), <IPlugin>{
            name: 'test-plugin',
        });
        actionHandlersRegistry.register(new FunctionActionHandler(), <IPlugin>{
            name: 'test-plugin',
        });

        templateUtilitiesRegistry.register(new ContextTemplateUtility());

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { virtual: virtualDefinitionFlow },
            context,
            {},
        );
        assert(snapshot.successful);

        const dynamicActionHandler = context.dynamicActionHandlers.find('test');
        assert(dynamicActionHandler);
        const processor = dynamicActionHandler.getProcessor(
            {
                assignTo: '$.ctx.a',
                pushTo: '$.ctx.p',
            },
            context,
            snapshot,
            {},
        );

        await processor.execute();

        assert.deepStrictEqual(context.ctx, {
            a: 'assignToValue',
            p: ['pushToValue'],
        });
    }
}
