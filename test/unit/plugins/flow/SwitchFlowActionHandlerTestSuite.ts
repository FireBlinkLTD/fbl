import { suite, test } from 'mocha-typescript';
import { SwitchFlowActionHandler } from '../../../../src/plugins/flow/SwitchFlowActionHandler';
import { ActionHandler, ActionSnapshot, EnabledActionSnapshot } from '../../../../src/models';
import { Container } from 'typedi';
import { ActionHandlersRegistry, FlowService } from '../../../../src/services';
import * as assert from 'assert';
import { IActionHandlerMetadata, IPlugin } from '../../../../src/interfaces';
import { ContextUtil } from '../../../../src/utils';
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
export class SwitchFlowActionHandlerTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new SwitchFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        test: {},
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
                        test: [],
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
                        test: 123,
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
                        test: 'tst',
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
                        value: 'tst',
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
                        is: 'tst',
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
                        value: 'tst',
                        is: 'tst',
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
                        value: 'tst',
                        is: {},
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
                        value: 'tst',
                        is: {
                            tst: [],
                        },
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
                        value: 'tst',
                        is: {
                            tst: 123,
                        },
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
                        value: 'tst',
                        is: {
                            tst: {
                                f1: true,
                                f2: false,
                            },
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
        const actionHandler = new SwitchFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    value: 'tst',
                    is: {
                        tst: {
                            f1: true,
                        },
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    value: 0,
                    is: {
                        0: {
                            f1: true,
                        },
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    value: true,
                    is: {
                        false: {
                            f1: true,
                        },
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async triggerActionHandlerDueToMatchWithString(): Promise<void> {
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);

        let actionHandlerOptions = false;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            actionHandlerOptions = opts;
        };

        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: '<%- secrets.value %><%- ctx.value %>',
            is: {
                test: {
                    [dummyActionHandler.id]: true,
                },
            },
        };

        const context = ContextUtil.generateEmptyContext();
        context.ctx.value = 'st';
        context.secrets.value = 'te';

        const snapshot = new EnabledActionSnapshot('.', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, true);
        assert.deepStrictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, {
            value: '{MASKED}st',
            is: options.is,
        });
    }

    @test()
    async triggerActionHandlerDueToMatchWithTemplateCondition(): Promise<void> {
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);

        let actionHandlerOptions = false;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            actionHandlerOptions = opts;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: '<%- secrets.value === ctx.value %>',
            is: {
                true: {
                    [dummyActionHandler.id]: true,
                },
            },
        };

        const context = ContextUtil.generateEmptyContext();
        context.ctx.value = 'test';
        context.secrets.value = 'test';

        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, true);
    }

    @test()
    async triggerActionHandlerDueToMatchWithNumber(): Promise<void> {
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);

        let actionHandlerOptions: any;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            actionHandlerOptions = opts;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: 0,
            is: {
                0: {
                    [dummyActionHandler.id]: true,
                },
                1: {
                    [dummyActionHandler.id]: false,
                },
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, true);
    }

    @test()
    async triggerActionHandlerDueToMatchWithBoolean(): Promise<void> {
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);

        let actionHandlerOptions: any;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            actionHandlerOptions = opts;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: true,
            is: {
                true: {
                    [dummyActionHandler.id]: true,
                },
                false: {
                    [dummyActionHandler.id]: false,
                },
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, true);
    }

    @test()
    async doNotTriggerActionHandlerDueToMismatch(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerOptions = false;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            actionHandlerOptions = opts;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: '<%- secrets.value %><%- ctx.value %>',
            is: {
                stte: {
                    [dummyActionHandler.id]: true,
                },
            },
        };

        const snapshot = new EnabledActionSnapshot('.', '.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();
        context.ctx.value = 'st';
        context.secrets.value = 'te';

        const processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, false);

        assert.deepStrictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, {
            value: '{MASKED}st',
            is: options.is,
        });
    }

    @test()
    async elseFlowActionHandler(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const actionHandlerOptions: number[] = [];
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any) => {
            actionHandlerOptions.push(opts);
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: '<%- secrets.value %><%- ctx.value %>',
            is: {
                stte: {
                    [dummyActionHandler.id]: 1,
                },
            },
            else: {
                [dummyActionHandler.id]: 2,
            },
        };

        const snapshot = new EnabledActionSnapshot('.', '.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();
        context.ctx.value = 'st';
        context.secrets.value = 'te';

        const processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.deepStrictEqual(actionHandlerOptions, [2]);

        assert.deepStrictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, {
            value: '{MASKED}st',
            is: options.is,
        });
    }
}
