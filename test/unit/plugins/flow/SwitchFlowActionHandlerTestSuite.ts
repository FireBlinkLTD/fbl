import {suite, test} from 'mocha-typescript';
import {SwitchFlowActionHandler} from '../../../../src/plugins/flow/SwitchFlowActionHandler';
import {ActionHandler, ActionSnapshot} from '../../../../src/models';
import {Container} from 'typedi';
import {ActionHandlersRegistry, FlowService} from '../../../../src/services';
import * as assert from 'assert';
import {IActionHandlerMetadata, IPlugin} from '../../../../src/interfaces';
import {ContextUtil} from '../../../../src/utils';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

class DummyActionHandler extends ActionHandler {
    static ID = 'testHandler';

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

const plugin: IPlugin = {
    name: 'test',
    version: '1.0.0',
    requires: {
        fbl: '>=0.0.0'
    }
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
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: {}
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: []
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 123
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 'tst'
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst'
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                is: 'tst'
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: 'tst'
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {}
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: []
                }
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: 123
                }
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: {
                        f1: true,
                        f2: false
                    }
                }
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new SwitchFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: {
                        f1: true
                    }
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 0,
                is: {
                    0: {
                        f1: true
                    }
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                value: true,
                is: {
                    false: {
                        f1: true
                    }
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;
    }

    @test()
    async triggerActionHandlerDueToMatchWithString(): Promise<void> {
        Container.get(FlowService).debug = true;
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);

        let actionHandlerOptions = false;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerOptions = opts;
        });

        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: '<%- secrets.value %><%- ctx.value %>',
            is: {
                test: {
                    [DummyActionHandler.ID]: true
                }
            }
        };

        const context = ContextUtil.generateEmptyContext();
        context.ctx.value = 'st';
        context.secrets.value = 'te';

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        // validate first to process template inside options
        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.strictEqual(actionHandlerOptions, true);
        assert.deepStrictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, {
            value: '{MASKED}st',
            is: options.is
        });
    }

    @test()
    async triggerActionHandlerDueToMatchWithTemplateCondition(): Promise<void> {
        Container.get(FlowService).debug = true;
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);

        let actionHandlerOptions = false;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerOptions = opts;
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: '<%- secrets.value === ctx.value %>',
            is: {
                true: {
                    [DummyActionHandler.ID]: true
                }
            }
        };

        const context = ContextUtil.generateEmptyContext();
        context.ctx.value = 'test';
        context.secrets.value = 'test';

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        // validate first to process template inside options
        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.strictEqual(actionHandlerOptions, true);
    }

    @test()
    async triggerActionHandlerDueToMatchWithNumber(): Promise<void> {
        Container.get(FlowService).debug = true;
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);

        let actionHandlerOptions: any;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerOptions = opts;
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: 0,
            is: {
                0: {
                    [DummyActionHandler.ID]: true
                },
                1: {
                    [DummyActionHandler.ID]: false
                }
            }
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        // validate first to process template inside options
        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.strictEqual(actionHandlerOptions, true);
    }

    @test()
    async triggerActionHandlerDueToMatchWithBoolean(): Promise<void> {
        Container.get(FlowService).debug = true;
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);

        let actionHandlerOptions: any;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerOptions = opts;
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: true,
            is: {
                true: {
                    [DummyActionHandler.ID]: true
                },
                false: {
                    [DummyActionHandler.ID]: false
                }
            }
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        // validate first to process template inside options
        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.strictEqual(actionHandlerOptions, true);
    }

    @test()
    async doNotTriggerActionHandlerDueToMismatch(): Promise<void> {
        Container.get(FlowService).debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerOptions = false;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerOptions = opts;
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: '<%- secrets.value %><%- ctx.value %>',
            is: {
                stte: {
                    [DummyActionHandler.ID]: true
                }
            }
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();
        context.ctx.value = 'st';
        context.secrets.value = 'te';

        // validate first to process template inside options
        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.strictEqual(actionHandlerOptions, false);

        assert.deepStrictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, {
            value: '{MASKED}st',
            is: options.is
        });
    }

    @test()
    async elseFlowActionHandler(): Promise<void> {
        Container.get(FlowService).debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const actionHandlerOptions: number[] = [];
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerOptions.push(opts);
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new SwitchFlowActionHandler();

        const options = {
            value: '<%- secrets.value %><%- ctx.value %>',
            is: {
                stte: {
                    [DummyActionHandler.ID]: 1
                }
            },
            else: {
                [DummyActionHandler.ID]: 2
            }
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();
        context.ctx.value = 'st';
        context.secrets.value = 'te';

        // validate first to process template inside options
        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.deepStrictEqual(actionHandlerOptions, [2]);

        assert.deepStrictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, {
            value: '{MASKED}st',
            is: options.is
        });
    }
}
