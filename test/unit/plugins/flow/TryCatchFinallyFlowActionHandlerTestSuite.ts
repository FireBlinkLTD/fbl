import {suite, test} from 'mocha-typescript';
import {ActionHandlersRegistry, FlowService} from '../../../../src/services';
import {ActionHandler, ActionSnapshot} from '../../../../src/models';
import {TryCatchFinallyFlowActionHandler} from '../../../../src/plugins/flow/TryCatchFinallyFlowActionHandler';
import {IActionHandlerMetadata, IPlugin} from '../../../../src/interfaces';
import {Container} from 'typedi';
import * as assert from 'assert';
import {ContextUtil} from '../../../../src/utils';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const plugin: IPlugin = {
    name: 'test',
    version: '1.0.0',
    requires: {
        fbl: '>=0.0.0'
    }
};

class DummyActionHandler extends ActionHandler {
    static ID = 'try.handler';

    constructor(
        private name: string,
        private fn: Function
    ) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return  <IActionHandlerMetadata> {
            id: DummyActionHandler.ID + '.' + this.name,
            version: '1.0.0'
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        await this.fn(options, context, snapshot, {});
    }
}

@suite()
class TryCatchFinallyFlowActionHandlerTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new TryCatchFinallyFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate(123, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('', context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                catch: {
                    ctx: {
                        inline: true
                    }
                }
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                catch: {
                    ctx: {
                        inline: true
                    }
                },
                finally: {
                    ctx: {
                        inline: true
                    }
                }
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                finally: {
                    ctx: {
                        inline: true
                    }
                }
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new TryCatchFinallyFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate({
                action: {
                    ctx: {
                        inline: true
                    }
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                action: {
                    ctx: {
                        inline: true
                    }
                },
                catch: {
                    ctx: {
                        inline: true
                    }
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                action: {
                    ctx: {
                        inline: true
                    }
                },
                catch: {
                    ctx: {
                        inline: true
                    }
                },
                finally: {
                    ctx: {
                        inline: true
                    }
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                action: {
                    ctx: {
                        inline: true
                    }
                },
                finally: {
                    ctx: {
                        inline: true
                    }
                }
            }, context, snapshot, {})
        ).to.be.not.rejected;
    }

    @test()
    async executeWithoutCatchAndFinallyBlocks(): Promise<void> {
        const flowService = Container.get(FlowService);
        flowService.debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler('action', async () => {
            throw new Error('Test');
        });

        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const tryFlowActionHandler = new TryCatchFinallyFlowActionHandler();
        actionHandlersRegistry.register(tryFlowActionHandler, plugin);

        const options = {
            action: {
                [DummyActionHandler.ID + '.action']: {}
            }
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', tryFlowActionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(snapshot.ignoreChildFailure, true);
    }

    @test()
    async executeWithCatchAndFinallyBlocks(): Promise<void> {
        const flowService = Container.get(FlowService);
        flowService.debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler('action', async () => {
            throw new Error('Test');
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        let catchCalled = false;
        const dummyCatchHandler = new DummyActionHandler('catch', async () => {
            catchCalled = true;
        });
        actionHandlersRegistry.register(dummyCatchHandler, plugin);

        let finallyCalled = false;
        const finallyCatchHandler = new DummyActionHandler('finally', async () => {
            finallyCalled = true;
        });
        actionHandlersRegistry.register(finallyCatchHandler, plugin);

        const tryFlowActionHandler = new TryCatchFinallyFlowActionHandler();
        actionHandlersRegistry.register(tryFlowActionHandler, plugin);

        const options = {
            action: {
                [DummyActionHandler.ID + '.action']: {}
            },
            catch: {
                [DummyActionHandler.ID + '.catch']: {}
            },
            finally: {
                [DummyActionHandler.ID + '.finally']: {}
            }
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', tryFlowActionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(snapshot.ignoreChildFailure, true);

        assert.strictEqual(catchCalled, true);
        assert.strictEqual(finallyCalled, true);
    }

    @test()
    async executeWithFailedCatchAndSuccessfulFinallyBlocks(): Promise<void> {
        const flowService = Container.get(FlowService);
        flowService.debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler('action', async () => {
            throw new Error('Test');
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const dummyCatchHandler = new DummyActionHandler('catch', async () => {
            throw new Error('Test');
        });
        actionHandlersRegistry.register(dummyCatchHandler, plugin);

        let finallyCalled = false;
        const finallyCatchHandler = new DummyActionHandler('finally', async () => {
            finallyCalled = true;
        });
        actionHandlersRegistry.register(finallyCatchHandler, plugin);

        const tryFlowActionHandler = new TryCatchFinallyFlowActionHandler();
        actionHandlersRegistry.register(tryFlowActionHandler, plugin);

        const options = {
            action: {
                [DummyActionHandler.ID + '.action']: {}
            },
            catch: {
                [DummyActionHandler.ID + '.catch']: {}
            },
            finally: {
                [DummyActionHandler.ID + '.finally']: {}
            }
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', tryFlowActionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(snapshot.ignoreChildFailure, false);

        assert.strictEqual(finallyCalled, true);
    }

    @test()
    async executeWithSuccessfulCatchAndFailedFinallyBlocks(): Promise<void> {
        const flowService = Container.get(FlowService);
        flowService.debug = true;
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler('action', async () => {
            throw new Error('Test');
        });
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        let catchCalled = false;
        const dummyCatchHandler = new DummyActionHandler('catch', async () => {
            catchCalled = true;
        });
        actionHandlersRegistry.register(dummyCatchHandler, plugin);

        const finallyCatchHandler = new DummyActionHandler('finally', async () => {
            throw new Error('Test');
        });
        actionHandlersRegistry.register(finallyCatchHandler, plugin);

        const tryFlowActionHandler = new TryCatchFinallyFlowActionHandler();
        actionHandlersRegistry.register(tryFlowActionHandler, plugin);

        const options = {
            action: {
                [DummyActionHandler.ID + '.action']: {}
            },
            catch: {
                [DummyActionHandler.ID + '.catch']: {}
            },
            finally: {
                [DummyActionHandler.ID + '.finally']: {}
            }
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction('.', tryFlowActionHandler.getMetadata().id, {}, options, context, {});

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(snapshot.ignoreChildFailure, false);

        assert.strictEqual(catchCalled, true);
    }
}
