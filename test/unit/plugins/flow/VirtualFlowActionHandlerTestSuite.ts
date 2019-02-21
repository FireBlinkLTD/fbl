import { test, suite } from 'mocha-typescript';
import { ActionHandler, ActionSnapshot } from '../../../../src/models';
import { Container } from 'typedi';
import { FlowService } from '../../../../src/services';
import { VirtualFlowActionHandler } from '../../../../src/plugins/flow/VirtualFlowActionHandler';
import { SequenceFlowActionHandler } from '../../../../src/plugins/flow/SequenceFlowActionHandler';
import { IActionHandlerMetadata, IPlugin } from '../../../../src/interfaces';
import * as assert from 'assert';
import { ContextUtil } from '../../../../src/utils';
import { FSTemplateUtility } from '../../../../src/plugins/templateUtilities/FSTemplateUtility';

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
    static ID = 'virtual.dummy.handler';

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
class VirtualFlowActionHandlerTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new VirtualFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.validate(123, context, snapshot, {})).to.be.rejected;

        await chai.expect(actionHandler.validate([], context, snapshot, {})).to.be.rejected;

        await chai.expect(actionHandler.validate('', context, snapshot, {})).to.be.rejected;

        await chai.expect(actionHandler.validate({}, context, snapshot, {})).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    id: 'test',
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    id: 'test',
                    action: 'test',
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    id: 'test',
                    action: 'test',
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
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
            ),
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new VirtualFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate(
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
            ),
        ).to.be.not.rejected;
    }

    @test()
    async successfulExecution(): Promise<void> {
        const flowService = Container.get(FlowService);
        const virtual = new VirtualFlowActionHandler();
        flowService.actionHandlersRegistry.register(virtual, plugin);
        flowService.actionHandlersRegistry.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        flowService.actionHandlersRegistry.register(
            new DummyActionHandler((options: any) => {
                opts = options;
            }),
            plugin,
        );

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
                        [DummyActionHandler.ID]: '<%- parameters.tst %>',
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
        const snapshot = await flowService.executeAction('.', '--', {}, actionOptions, context, {});

        assert(snapshot.successful);
        assert.strictEqual(opts, '_value_');
    }

    @test()
    async testDefaults(): Promise<void> {
        const flowService = Container.get(FlowService);
        const virtual = new VirtualFlowActionHandler();
        flowService.actionHandlersRegistry.register(virtual, plugin);
        flowService.actionHandlersRegistry.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        flowService.actionHandlersRegistry.register(
            new DummyActionHandler((options: any) => {
                opts = options;
            }),
            plugin,
        );

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
                        [DummyActionHandler.ID]: '<%- parameters.tst %>',
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
        const snapshot = await flowService.executeAction('.', '--', {}, actionOptions, context, {});

        assert(snapshot.successful);
        assert.strictEqual(opts, '_val');
    }

    @test()
    async testDefaultsWithMergeModifiers(): Promise<void> {
        const flowService = Container.get(FlowService);
        const virtual = new VirtualFlowActionHandler();
        flowService.actionHandlersRegistry.register(virtual, plugin);
        flowService.actionHandlersRegistry.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        flowService.actionHandlersRegistry.register(
            new DummyActionHandler((options: any) => {
                opts = options;
            }),
            plugin,
        );

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
                        [DummyActionHandler.ID]: '<%- parameters.tst %>',
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
        const snapshot = await flowService.executeAction('.', '--', {}, actionOptions, context, {});

        assert(snapshot.successful);
        assert.strictEqual(opts, 'ue__val');
    }

    @test()
    async testDefaultsWithMergeFunction(): Promise<void> {
        const flowService = Container.get(FlowService);
        const virtual = new VirtualFlowActionHandler();
        flowService.actionHandlersRegistry.register(virtual, plugin);
        flowService.actionHandlersRegistry.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        flowService.actionHandlersRegistry.register(
            new DummyActionHandler((options: any) => {
                opts = options;
            }),
            plugin,
        );

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
                        [DummyActionHandler.ID]: '<%- parameters.tst %>',
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
        const snapshot = await flowService.executeAction('.', '--', {}, actionOptions, context, {});

        assert(snapshot.successful);
        assert.strictEqual(opts, '_value_');
    }

    @test()
    async failVirtualValidation(): Promise<void> {
        const flowService = Container.get(FlowService);
        flowService.debug = true;

        const virtual = new VirtualFlowActionHandler();
        flowService.actionHandlersRegistry.register(virtual, plugin);
        flowService.actionHandlersRegistry.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        flowService.actionHandlersRegistry.register(
            new DummyActionHandler((options: any) => {
                opts = options;
            }),
            plugin,
        );

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
                        [DummyActionHandler.ID]: '<%- parameters.tst %>',
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
        const snapshot = await flowService.executeAction('.', '--', {}, actionOptions, context, {});

        assert(!snapshot.successful);
        const virtualChildSnapshot: ActionSnapshot = snapshot
            .getSteps()
            .find(s => s.type === 'child' && s.payload.idOrAlias === 'virtual.test').payload;
        assert.strictEqual(
            virtualChildSnapshot.getSteps().find(s => s.type === 'failure').payload,
            'Error: tst.t is not of a type(s) string',
        );
    }

    @test()
    async noSchemaValidation(): Promise<void> {
        const flowService = Container.get(FlowService);

        const virtual = new VirtualFlowActionHandler();
        flowService.actionHandlersRegistry.register(virtual, plugin);
        flowService.actionHandlersRegistry.register(new SequenceFlowActionHandler(), plugin);

        let opts;
        flowService.actionHandlersRegistry.register(
            new DummyActionHandler((options: any) => {
                opts = options;
            }),
            plugin,
        );

        const actionOptions = [
            {
                [virtual.getMetadata().id]: {
                    id: 'virtual.test',
                    action: {
                        [DummyActionHandler.ID]: '<%- parameters.tst.t %>',
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
        const snapshot = await flowService.executeAction('.', '--', {}, actionOptions, context, {});

        assert(snapshot.successful);
        assert.strictEqual(opts, 123);
    }

    @test()
    async workingDirectory(): Promise<void> {
        const flowService = Container.get(FlowService);

        const virtual = new VirtualFlowActionHandler();
        flowService.actionHandlersRegistry.register(virtual, plugin);
        flowService.templateUtilityRegistry.register(new FSTemplateUtility());

        let opts;
        flowService.actionHandlersRegistry.register(
            new DummyActionHandler((options: any) => {
                opts = options;
            }),
            plugin,
        );

        const context = ContextUtil.generateEmptyContext();

        await flowService.executeAction(
            '/tmp1',
            virtual.getMetadata().id,
            {},
            {
                id: 'virtual.test',
                action: {
                    [DummyActionHandler.ID]: '<%- parameters.tst.t %>',
                },
            },
            context,
            {},
        );

        const snapshot = await flowService.executeAction(
            '/tmp2',
            'virtual.test',
            {},
            {
                tst: {
                    t: '<%- $.fs.getAbsolutePath("index.txt") %>',
                },
            },
            context,
            {},
        );

        assert(snapshot.successful);
        assert.strictEqual(opts, '/tmp1/index.txt');
    }
}
