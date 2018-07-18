import {suite, test} from 'mocha-typescript';
import {SwitchFlowHandler} from '../../../../src/plugins/flow/SwitchFlowHandler';
import {ActionHandler, IHandlerMetadata} from '../../../../src/models';
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

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };

        await chai.expect(
            actionHandler.validate([], context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: {}
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: []
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 123
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 'tst'
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst'
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                is: 'tst'
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: 'tst'
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {}
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: []
                }
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: 123
                }
            }, context)
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
            }, context)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new SwitchFlowHandler();

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };

        await chai.expect(
            actionHandler.validate({
                value: 'tst',
                is: {
                    tst: {
                        f1: true
                    }
                }
            }, context)
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
            },
            wd: '.'
        };

        // validate first to process template inside options
        await chai.expect(
            actionHandler.validate(options, context)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context)
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

        const context = <IContext> {
            ctx: {
                value: 'tst2'
            },
            wd: '.'
        };

        // validate first to process template inside options
        await chai.expect(
            actionHandler.validate(options, context)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(options, context)
        ).to.be.not.rejected;

        assert.strictEqual(actionHandlerOptions, false);
    }
}
