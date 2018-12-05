import {suite, test} from 'mocha-typescript';
import * as assert from 'assert';
import { VirtualFlowActionHandler } from '../../../../src/plugins/flow/VirtualFlowActionHandler';
import Container from 'typedi';
import { ActionHandlersRegistry, IPlugin, TemplateUtilitiesRegistry, ContextUtil, ActionSnapshot, FlowService } from '../../../../src';
import { ContextTemplateUtility } from '../../../../src/plugins/templateUtilities/ContextTemplateUtility';
import { FunctionActionHandler } from '../../../../src/plugins/exec/FunctionActionHandler';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class ContextTemplateUtilityTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async defineVirtual() {
        const virtualDefinitionFlow = {
            id: 'test',
            parametersSchema: {
                type: 'object',
                properties: {
                    assignTo: '<%- JSON.stringify($.assignToSchema()) %>',
                    pushTo: '<%- JSON.stringify($.pushToSchema()) %>'
                }
            },
            action: {
                fn: `
                    $.assignTo(parameters.assignTo, 'assignToValue');
                    $.pushTo(parameters.pushTo, 'pushToValue');                    
                `
            }
        };
        
        const flowService = Container.get(FlowService);
        const templateUtilitiesRegistry = Container.get(TemplateUtilitiesRegistry);
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);        

        actionHandlersRegistry.register(
            new VirtualFlowActionHandler(),
            <IPlugin> {
                name: 'test-plugin'
            }
        );
        actionHandlersRegistry.register(
            new FunctionActionHandler(),
            <IPlugin> {
                name: 'test-plugin'
            }
        );
        
        templateUtilitiesRegistry.register(new ContextTemplateUtility());
        
        const context = ContextUtil.generateEmptyContext();    
        const snapshot = await flowService.executeAction('.', 'virtual', {}, virtualDefinitionFlow, context, {});    
        assert(snapshot.successful);        

        const dynamicActionHandler = context.dynamicActionHandlers.find('test');
        assert(dynamicActionHandler);

        await dynamicActionHandler.execute({
            assignTo: '$.ctx.a',
            pushTo: '$.ctx.p'
        }, context, snapshot, {});

        assert.deepStrictEqual(context.ctx, {
            a: 'assignToValue',
            p: ['pushToValue']
        });
    }
}
