import {suite, test} from 'mocha-typescript';
import {SwitchFlowHandler} from '../../../../src/plugins/flow/SwitchFlowHandler';
import {ActionHandler, ActionSnapshot, IHandlerMetadata} from '../../../../src/models';
import {Container} from 'typedi';
import {ActionHandlersRegistry} from '../../../../src/services';
import * as assert from 'assert';
import {IContext} from '../../../../src/interfaces';

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

    getMetadata(): IHandlerMetadata {
        return  <IHandlerMetadata> {
            id: DummyActionHandler.ID,
            version: '1.0.0'
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        await this.fn(options, context, snapshot);
    }
}

@suite()
export class SwitchFlowHandlerTestSuite {

    after() {
        Container
            .get<ActionHandlersRegistry>(ActionHandlersRegistry)
            .unregister(DummyActionHandler.ID);
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new SwitchFlowHandler();

        const context = <IContext> {
            ctx: {}
        };
        
        const snapshot = new ActionSnapshot('.', '');

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: {}
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: []
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 123
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 'tst'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                is: 'tst'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: 'tst'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {}
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: []
                }
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: 123
                }
            }, context, snapshot)
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
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new SwitchFlowHandler();

        const context = <IContext> {
            ctx: {}
        };

        const snapshot = new ActionSnapshot('.', '');

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: {
                        f1: true
                    }
                }
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async triggerActionHandlerDueToMatch(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerOptions = false;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerOptions = opts;
        });
        actionHandlersRegistry.register(dummyActionHandler);

        const actionHandler = new SwitchFlowHandler();

        const options = {
            value: '<%- ctx.value %>',
            is: {
                tst: {
                    [DummyActionHandler.ID]: true
                }
            }
        };

        const context = <IContext> {
            ctx: {
                value: 'tst'
            }
        };

        const snapshot = new ActionSnapshot('.', '');

        // validate first to process template inside options
        await chai.expect(
            actionHandler.validate(options, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context, snapshot)
        ).to.be.not.rejected;

        assert.strictEqual(actionHandlerOptions, true);
    }

    @test()
    async doNotTriggerActionHandlerDueToMismatch(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerOptions = false;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerOptions = opts;
        });
        actionHandlersRegistry.register(dummyActionHandler);

        const actionHandler = new SwitchFlowHandler();

        const options = {
            value: '<%- ctx.value %>',
            is: {
                tst: {
                    [DummyActionHandler.ID]: true
                }
            }
        };

        const snapshot = new ActionSnapshot('.',  '');

        const context = <IContext> {
            ctx: {
                value: 'tst2'
            }
        };

        // validate first to process template inside options
        await chai.expect(
            actionHandler.validate(options, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context, snapshot)
        ).to.be.not.rejected;

        assert.strictEqual(actionHandlerOptions, false);
    }
}
