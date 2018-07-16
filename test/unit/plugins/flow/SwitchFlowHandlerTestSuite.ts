import {suite, test} from 'mocha-typescript';
import {SwitchFlowHandler} from '../../../../src/plugins/flow/SwitchFlowHandler';
import {ActionHandler, IHandlerMetadata} from '../../../../src/models';
import {Container} from 'typedi';
import {ActionHandlersRegistry} from '../../../../src/services';
import * as assert from 'assert';

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

    async execute(options: any, context: any): Promise<void> {
        await this.fn(options, context);
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

        await chai.expect(
            actionHandler.validate([], {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: {}
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: []
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 123
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 'tst'
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst'
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                is: 'tst'
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: 'tst'
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {}
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: []
                }
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: 123
                }
            }, {})
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
            }, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new SwitchFlowHandler();

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: {
                        f1: true
                    }
                }
            }, {})
        ).to.be.not.rejected;
    }

    @test()
    async triggerActionHandlerDueToMatch(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerInvoked = false;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerInvoked = opts;
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

        const context = {
            value: 'tst'
        };

        // validate first to process template inside options
        await chai.expect(
            actionHandler.validate(options, context)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context)
        ).to.be.not.rejected;

        assert.strictEqual(actionHandlerInvoked, true);
    }

    @test()
    async doNotTriggerActionHandlerDueToMismatch(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerInvoked = false;
        const dummyActionHandler = new DummyActionHandler(async (opts: any) => {
            actionHandlerInvoked = opts;
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

        const context = {
            value: 'tst2'
        };

        // validate first to process template inside options
        await chai.expect(
            actionHandler.validate(options, context)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context)
        ).to.be.not.rejected;

        assert.strictEqual(actionHandlerInvoked, false);
    }
}
