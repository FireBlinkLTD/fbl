import { suite, test } from 'mocha-typescript';
import { ActionHandlersRegistry, FlowService } from '../../../../src/services';
import { ActionSnapshot } from '../../../../src/models';
import { TryCatchFinallyFlowActionHandler } from '../../../../src/plugins/flow/TryCatchFinallyFlowActionHandler';
import { IPlugin } from '../../../../src/interfaces';
import * as assert from 'assert';
import { ContextUtil } from '../../../../src/utils';
import { DummyActionHandler } from '../../../assets/fakePlugins/DummyActionHandler';
import { ActionError, UNEXPECTED } from '../../../../src';

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
class TryCatchFinallyFlowActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new TryCatchFinallyFlowActionHandler();
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
                        catch: {
                            ctx: {
                                inline: true,
                            },
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
                        catch: {
                            ctx: {
                                inline: true,
                            },
                        },
                        finally: {
                            ctx: {
                                inline: true,
                            },
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
                        finally: {
                            ctx: {
                                inline: true,
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
        const actionHandler = new TryCatchFinallyFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    action: {
                        ctx: {
                            inline: true,
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
                    action: {
                        ctx: {
                            inline: true,
                        },
                    },
                    catch: {
                        ctx: {
                            inline: true,
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
                    action: {
                        ctx: {
                            inline: true,
                        },
                    },
                    catch: {
                        ctx: {
                            inline: true,
                        },
                    },
                    finally: {
                        ctx: {
                            inline: true,
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
                    action: {
                        ctx: {
                            inline: true,
                        },
                    },
                    finally: {
                        ctx: {
                            inline: true,
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
    async executeWithoutCatchAndFinallyBlocks(): Promise<void> {
        const flowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async () => {
            throw new Error('Test');
        };

        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const tryFlowActionHandler = new TryCatchFinallyFlowActionHandler();
        actionHandlersRegistry.register(tryFlowActionHandler, plugin);

        const options = {
            action: {
                [dummyActionHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [tryFlowActionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(snapshot.ignoreChildFailure, true);
    }

    @test()
    async executeWithCatchAndFinallyBlocks(): Promise<void> {
        const flowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async () => {
            throw new ActionError('Test', 'TEST');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        let catchCalled = false;
        const dummyCatchHandler = new DummyActionHandler();
        dummyCatchHandler.executeFn = async () => {
            catchCalled = context.ctx.errorCode === 'TEST';
        };
        actionHandlersRegistry.register(dummyCatchHandler, plugin);

        let finallyCalled = false;
        const finallyCatchHandler = new DummyActionHandler();
        finallyCatchHandler.executeFn = async () => {
            finallyCalled = context.ctx.errorCode === 'TEST';
        };
        actionHandlersRegistry.register(finallyCatchHandler, plugin);

        const tryFlowActionHandler = new TryCatchFinallyFlowActionHandler();
        actionHandlersRegistry.register(tryFlowActionHandler, plugin);

        const options = {
            action: {
                [dummyActionHandler.id]: {},
            },
            errorCode: {
                assignTo: '$.ctx.errorCode',
                pushTo: '$.ctx.errorCodes',
            },
            catch: {
                [dummyCatchHandler.id]: {},
            },
            finally: {
                [finallyCatchHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [tryFlowActionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(snapshot.ignoreChildFailure, true);

        assert.strictEqual(catchCalled, true);
        assert.strictEqual(finallyCalled, true);
        assert.strictEqual(context.ctx.errorCode, 'TEST');
        assert.deepStrictEqual(context.ctx.errorCodes, ['TEST']);
    }

    @test()
    async executeWithCatchAndFinallyBlocksAndRegularError(): Promise<void> {
        const flowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async () => {
            throw new Error('Test');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        let catchCalled = false;
        const dummyCatchHandler = new DummyActionHandler();
        dummyCatchHandler.executeFn = async () => {
            catchCalled = true;
        };
        actionHandlersRegistry.register(dummyCatchHandler, plugin);

        let finallyCalled = false;
        const finallyCatchHandler = new DummyActionHandler();
        finallyCatchHandler.executeFn = async () => {
            finallyCalled = true;
        };
        actionHandlersRegistry.register(finallyCatchHandler, plugin);

        const tryFlowActionHandler = new TryCatchFinallyFlowActionHandler();
        actionHandlersRegistry.register(tryFlowActionHandler, plugin);

        const options = {
            action: {
                [dummyActionHandler.id]: {},
            },
            errorCode: {
                assignTo: '$.ctx.errorCode',
                pushTo: '$.ctx.errorCodes',
            },
            catch: {
                [dummyCatchHandler.id]: {},
            },
            finally: {
                [finallyCatchHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [tryFlowActionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(snapshot.ignoreChildFailure, true);

        assert.strictEqual(catchCalled, true);
        assert.strictEqual(finallyCalled, true);
        assert.strictEqual(context.ctx.errorCode, UNEXPECTED);
        assert.deepStrictEqual(context.ctx.errorCodes, [UNEXPECTED]);
    }

    @test()
    async executeWithSuccessfulActionAndFinallyBlocks(): Promise<void> {
        const flowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        const dummyActionHandler = new DummyActionHandler();
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        let catchCalled = false;
        const dummyCatchHandler = new DummyActionHandler();
        dummyCatchHandler.executeFn = async () => {
            catchCalled = true;
        };
        actionHandlersRegistry.register(dummyCatchHandler, plugin);

        let finallyCalled = false;
        const finallyCatchHandler = new DummyActionHandler();
        finallyCatchHandler.executeFn = async () => {
            finallyCalled = true;
        };
        actionHandlersRegistry.register(finallyCatchHandler, plugin);

        const tryFlowActionHandler = new TryCatchFinallyFlowActionHandler();
        actionHandlersRegistry.register(tryFlowActionHandler, plugin);

        const options = {
            action: {
                [dummyActionHandler.id]: {},
            },
            catch: {
                [dummyCatchHandler.id]: {},
            },
            finally: {
                [finallyCatchHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [tryFlowActionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);

        assert.strictEqual(catchCalled, false);
        assert.strictEqual(finallyCalled, true);
    }

    @test()
    async executeWithFailedCatchAndSuccessfulFinallyBlocks(): Promise<void> {
        const flowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async () => {
            throw new Error('Test');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const dummyCatchHandler = new DummyActionHandler();
        dummyCatchHandler.executeFn = async () => {
            throw new Error('Test');
        };
        actionHandlersRegistry.register(dummyCatchHandler, plugin);

        let finallyCalled = false;
        const finallyCatchHandler = new DummyActionHandler();
        finallyCatchHandler.executeFn = async () => {
            finallyCalled = true;
        };
        actionHandlersRegistry.register(finallyCatchHandler, plugin);

        const tryFlowActionHandler = new TryCatchFinallyFlowActionHandler();
        actionHandlersRegistry.register(tryFlowActionHandler, plugin);

        const options = {
            action: {
                [dummyActionHandler.id]: {},
            },
            catch: {
                [dummyCatchHandler.id]: {},
            },
            finally: {
                [finallyCatchHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [tryFlowActionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(snapshot.ignoreChildFailure, false);

        assert.strictEqual(finallyCalled, true);
    }

    @test()
    async executeWithSuccessfulCatchAndFailedFinallyBlocks(): Promise<void> {
        const flowService = FlowService.instance;
        const actionHandlersRegistry = ActionHandlersRegistry.instance;

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async () => {
            throw new Error('Test');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        let catchCalled = false;
        const dummyCatchHandler = new DummyActionHandler();
        dummyCatchHandler.executeFn = async () => {
            catchCalled = true;
        };
        actionHandlersRegistry.register(dummyCatchHandler, plugin);

        const finallyCatchHandler = new DummyActionHandler();
        finallyCatchHandler.executeFn = async () => {
            throw new Error('Test');
        };
        actionHandlersRegistry.register(finallyCatchHandler, plugin);

        const tryFlowActionHandler = new TryCatchFinallyFlowActionHandler();
        actionHandlersRegistry.register(tryFlowActionHandler, plugin);

        const options = {
            action: {
                [dummyActionHandler.id]: {},
            },
            catch: {
                [dummyCatchHandler.id]: {},
            },
            finally: {
                [finallyCatchHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [tryFlowActionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(snapshot.ignoreChildFailure, false);

        assert.strictEqual(catchCalled, true);
    }
}
