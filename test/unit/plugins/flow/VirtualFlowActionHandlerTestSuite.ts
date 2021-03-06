import { test, suite } from 'mocha-typescript';
import { ActionSnapshot } from '../../../../src/models';
import { ActionHandlersRegistry, FlowService, TemplateUtilitiesRegistry } from '../../../../src/services';
import { VirtualFlowActionHandler } from '../../../../src/plugins/flow/VirtualFlowActionHandler';
import { SequenceFlowActionHandler } from '../../../../src/plugins/flow/SequenceFlowActionHandler';
import { IPlugin, IContext } from '../../../../src/interfaces';
import * as assert from 'assert';
import { ContextUtil } from '../../../../src/utils';
import { FSTemplateUtility } from '../../../../src/plugins/templateUtilities/FSTemplateUtility';
import { DummyActionHandler } from '../../../assets/fakePlugins/DummyActionHandler';

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

@suite()
class VirtualFlowActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new VirtualFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor('', context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        id: 'test',
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        id: 'test',
                        action: {},
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        id: 'test',
                        parametersSchema: {
                            type: {
                                blue: 'green',
                            },
                        },
                        action: {
                            ctx: 'yes',
                        },
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new VirtualFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    id: 'test',
                    parametersSchema: {
                        type: 'string',
                    },
                    action: {
                        ctx: 'yes',
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async successfulExecution(): Promise<void> {
        const flowService = FlowService.instance;
        const virtual = new VirtualFlowActionHandler();
        ActionHandlersRegistry.instance.register(virtual, plugin);
        ActionHandlersRegistry.instance.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (options: any) => {
            opts = options;
        };
        ActionHandlersRegistry.instance.register(dummyActionHandler, plugin);

        const actionOptions = [
            {
                [virtual.getMetadata().id]: {
                    id: 'virtual.test',
                    parametersSchema: {
                        type: 'object',
                        properties: {
                            tst: {
                                type: 'string',
                            },
                        },
                    },
                    action: {
                        [dummyActionHandler.id]: '<%- parameters.tst %>',
                    },
                },
            },
            {
                'virtual.test': {
                    tst: '_value_',
                },
            },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('index.yml', '.', { '--': actionOptions }, context, {});

        assert(snapshot.successful);
        assert.strictEqual(opts, '_value_');
    }

    @test()
    async testDefaults(): Promise<void> {
        const flowService = FlowService.instance;
        const virtual = new VirtualFlowActionHandler();
        ActionHandlersRegistry.instance.register(virtual, plugin);
        ActionHandlersRegistry.instance.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (options: any) => {
            opts = options;
        };
        ActionHandlersRegistry.instance.register(dummyActionHandler, plugin);

        const actionOptions = [
            {
                [virtual.getMetadata().id]: {
                    id: 'virtual.test',
                    parametersSchema: {
                        type: 'object',
                        properties: {
                            tst: {
                                type: 'string',
                            },
                        },
                    },
                    defaults: {
                        values: {
                            tst: 'ue_',
                        },
                    },
                    action: {
                        [dummyActionHandler.id]: '<%- parameters.tst %>',
                    },
                },
            },
            {
                'virtual.test': {
                    tst: '_val',
                },
            },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('index.yml', '.', { '--': actionOptions }, context, {});

        assert(snapshot.successful);
        assert.strictEqual(opts, '_val');
    }

    @test()
    async testDefaultsWithMergeModifiers(): Promise<void> {
        const flowService = FlowService.instance;
        const virtual = new VirtualFlowActionHandler();
        ActionHandlersRegistry.instance.register(virtual, plugin);
        ActionHandlersRegistry.instance.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (options: any) => {
            opts = options;
        };
        ActionHandlersRegistry.instance.register(dummyActionHandler, plugin);

        const actionOptions = [
            {
                [virtual.getMetadata().id]: {
                    id: 'virtual.test',
                    parametersSchema: {
                        type: 'object',
                        properties: {
                            tst: {
                                type: 'string',
                            },
                        },
                    },
                    defaults: {
                        values: {
                            tst: 'ue_',
                        },
                        modifiers: {
                            '$.tst': 'return `${defaults}${parameters}`;',
                        },
                    },
                    action: {
                        [dummyActionHandler.id]: '<%- parameters.tst %>',
                    },
                },
            },
            {
                'virtual.test': {
                    tst: '_val',
                },
            },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('index.yml', '.', { '--': actionOptions }, context, {});

        assert(snapshot.successful);
        assert.strictEqual(opts, 'ue__val');
    }

    @test()
    async testDefaultsWithMergeFunction(): Promise<void> {
        const flowService = FlowService.instance;
        const virtual = new VirtualFlowActionHandler();
        ActionHandlersRegistry.instance.register(virtual, plugin);
        ActionHandlersRegistry.instance.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (options: any) => {
            opts = options;
        };
        ActionHandlersRegistry.instance.register(dummyActionHandler, plugin);

        const actionOptions = [
            {
                [virtual.getMetadata().id]: {
                    id: 'virtual.test',
                    parametersSchema: {
                        type: 'object',
                        properties: {
                            tst: {
                                type: 'string',
                            },
                        },
                    },
                    defaults: {
                        values: {
                            tst: 'ue_',
                        },
                        mergeFunction: 'return { tst: parameters.tst + defaults.tst };',
                    },
                    action: {
                        [dummyActionHandler.id]: '<%- parameters.tst %>',
                    },
                },
            },
            {
                'virtual.test': {
                    tst: '_val',
                },
            },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('index.yml', '.', { '--': actionOptions }, context, {});

        assert(snapshot.successful);
        assert.strictEqual(opts, '_value_');
    }

    @test()
    async failVirtualValidation(): Promise<void> {
        const flowService = FlowService.instance;
        flowService.debug = true;

        const virtual = new VirtualFlowActionHandler();
        ActionHandlersRegistry.instance.register(virtual, plugin);
        ActionHandlersRegistry.instance.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (options: any) => {
            opts = options;
        };
        ActionHandlersRegistry.instance.register(dummyActionHandler, plugin);

        const actionOptions = [
            {
                [virtual.getMetadata().id]: {
                    id: 'virtual.test',
                    parametersSchema: {
                        type: 'object',
                        properties: {
                            tst: {
                                type: 'object',
                                properties: {
                                    t: {
                                        type: 'string',
                                    },
                                },
                            },
                        },
                    },
                    action: {
                        [dummyActionHandler.id]: '<%- parameters.tst %>',
                    },
                },
            },
            {
                'virtual.test': {
                    tst: {
                        t: 123,
                    },
                },
            },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('index.yml', '.', { '--': actionOptions }, context, {});

        assert(!snapshot.successful);
        const virtualChildSnapshot: ActionSnapshot = snapshot
            .getSteps()
            .find((s) => s.type === 'child' && s.payload.idOrAlias === 'virtual.test').payload;
        assert.strictEqual(
            virtualChildSnapshot.getSteps().find((s) => s.type === 'failure').payload.message,
            'tst.t is not of a type(s) string',
        );
    }

    @test()
    async noSchemaValidation(): Promise<void> {
        const flowService = FlowService.instance;

        const virtual = new VirtualFlowActionHandler();
        ActionHandlersRegistry.instance.register(virtual, plugin);
        ActionHandlersRegistry.instance.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (options: any) => {
            opts = options;
        };
        ActionHandlersRegistry.instance.register(dummyActionHandler, plugin);

        const actionOptions = [
            {
                [virtual.getMetadata().id]: {
                    id: 'virtual.test',
                    action: {
                        [dummyActionHandler.id]: '<%- parameters.tst.t %>',
                    },
                },
            },
            {
                'virtual.test': {
                    tst: {
                        t: 123,
                    },
                },
            },
        ];

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('index.yml', '.', { '--': actionOptions }, context, {});

        assert(snapshot.successful);
        assert.strictEqual(opts, 123);
    }

    @test()
    async workingDirectory(): Promise<void> {
        const flowService = FlowService.instance;

        const virtual = new VirtualFlowActionHandler();
        ActionHandlersRegistry.instance.register(virtual, plugin);
        TemplateUtilitiesRegistry.instance.register(new FSTemplateUtility());

        let opts;
        let wd;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (options: any, ctx: IContext, s: ActionSnapshot) => {
            opts = options;
            wd = s.wd;
        };
        ActionHandlersRegistry.instance.register(dummyActionHandler, plugin);

        const context = ContextUtil.generateEmptyContext();

        await flowService.executeAction(
            'index.yml',
            '/tmp1',
            {
                [virtual.getMetadata().id]: {
                    id: 'virtual.test',
                    action: {
                        [dummyActionHandler.id]: '<%- $.fs.getAbsolutePath(parameters.tst.t) %>',
                    },
                },
            },
            context,
            {},
        );

        const snapshot = await flowService.executeAction(
            'index.yml',
            '/tmp2',
            {
                'virtual.test': {
                    tst: {
                        t: 'index.txt',
                    },
                },
            },
            context,
            {},
        );

        assert(snapshot.successful);
        assert.strictEqual(opts, '/tmp1/index.txt');
        assert.strictEqual(wd, '/tmp1');
    }

    @test()
    async dynamicWorkingDirectory(): Promise<void> {
        const flowService = FlowService.instance;

        const virtual = new VirtualFlowActionHandler();
        ActionHandlersRegistry.instance.register(virtual, plugin);
        TemplateUtilitiesRegistry.instance.register(new FSTemplateUtility());

        let opts;
        let wd;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (options: any, ctx: IContext, s: ActionSnapshot) => {
            opts = options;
            wd = s.wd;
        };
        ActionHandlersRegistry.instance.register(dummyActionHandler, plugin);

        const context = ContextUtil.generateEmptyContext();

        await flowService.executeAction(
            'index.yml',
            '/tmp1',
            {
                [virtual.getMetadata().id]: {
                    id: 'virtual.test',
                    dynamicWorkDir: true,
                    action: {
                        [dummyActionHandler.id]: '<%- $.fs.getAbsolutePath(parameters.tst.t) %>',
                    },
                },
            },
            context,
            {},
        );

        const snapshot = await flowService.executeAction(
            'index.yml',
            '/tmp2',
            {
                'virtual.test': {
                    tst: {
                        t: 'index.txt',
                    },
                },
            },
            context,
            {},
        );

        assert(snapshot.successful);
        assert.strictEqual(opts, '/tmp2/index.txt');
        assert.strictEqual(wd, '/tmp2');
    }
}
