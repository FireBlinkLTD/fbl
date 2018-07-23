import {suite, test} from 'mocha-typescript';
import {Container} from 'typedi';
import {FireBlinkLogistics} from '../../src/fbl';
import {IContext, IFlow} from '../../src/interfaces';
import {ActionHandler, IHandlerMetadata} from '../../src/models';
import * as assert from 'assert';
import {ActionHandlersRegistry, FlowService} from '../../src/services';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const jsyaml = require('js-yaml');

class DummyActionHandler extends ActionHandler {
    static ID = 'testHandler';

    constructor(
        private fn: Function,
        private skipExecution: boolean
    ) {
        super();
    }

    getMetadata(): IHandlerMetadata {
        return  <IHandlerMetadata> {
            id: DummyActionHandler.ID,
            version: '1.0.0'
        };
    }

    async isShouldExecute(options: any, context: any): Promise<boolean> {
        return !this.skipExecution;
    }

    async execute(options: any, context: any): Promise<void> {
        await this.fn(options, context);
    }
}

@suite()
export class FblTestSuite {
    after() {
        const registry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        registry
            .unregister(DummyActionHandler.ID);

        Container.remove(FireBlinkLogistics);
        Container.remove(FlowService);
    }

    @test()
    async pipeline(): Promise<void> {
        const fbl = Container.get<FireBlinkLogistics>(FireBlinkLogistics);

        fbl.flowService.debug = true;

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(new DummyActionHandler(async (opt: any) => {
            result = opt;
        }, false));

        const context = <IContext> {
            ctx: {
                var: 'test123'
            }
        };

        const snapshot = await fbl.execute('.', <IFlow> {
            version: '1.0.0',
            pipeline: {
                [DummyActionHandler.ID]: 'tst'
            }
        }, context);

        assert.deepStrictEqual('tst', snapshot.getSteps().find(s => s.type === 'options').payload);
        assert.deepStrictEqual(context, snapshot.getSteps().find(s => s.type === 'context').payload);
        assert.strictEqual(result, 'tst');

        await chai.expect(fbl.execute('.', <IFlow> {
            version: '1.0.0',
            pipeline: {}
        }, <IContext> {
            ctx: {}
        })).to.be.rejected;
    }

    @test()
    async skippedExecution(): Promise<void> {
        const fbl = Container.get<FireBlinkLogistics>(FireBlinkLogistics);

        fbl.flowService.debug = true;

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(new DummyActionHandler(async (opt: any) => {
            result = opt;
        }, true));

        await fbl.execute('.', <IFlow> {
            version: '1.0.0',
            pipeline: {
                [DummyActionHandler.ID]: 'tst'
            }
        }, <IContext> {
            ctx: {}
        });

        assert.strictEqual(result, null);
    }

    @test
    async failedExecution() {
        const fbl = Container.get<FireBlinkLogistics>(FireBlinkLogistics);

        fbl.flowService.debug = true;

        fbl.flowService.actionHandlersRegistry.register(new DummyActionHandler(async (opt: any) => {
            throw new Error('test');
        }, false));

        const snapshot = await fbl.execute('.', <IFlow> {
            version: '1.0.0',
            pipeline: {
                [DummyActionHandler.ID]: 'tst'
            }
        }, <IContext> {
            ctx: {}
        });

        assert.strictEqual(snapshot.successful, false);
    }

    @test()
    async ejsTemplateValidation() {
        const fbl = Container.get<FireBlinkLogistics>(FireBlinkLogistics);

        fbl.flowService.debug = true;

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(new DummyActionHandler(async (opt: any) => {
            result = opt;
        }, false));

        const snapshot = await fbl.execute('.', <IFlow> {
            version: '1.0.0',
            pipeline: {
                [DummyActionHandler.ID]: `<%- ctx.t1`
            }
        }, <IContext> {
            ctx: {
                t1: 'tst'
            }
        });

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'failure').payload, 'Error: Could not find matching close tag for "<%-".');
        assert.strictEqual(result, null);
    }


    @test()
    async templateProcessingStringEscape() {
        const fbl = Container.get<FireBlinkLogistics>(FireBlinkLogistics);

        fbl.flowService.debug = true;

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(new DummyActionHandler(async (opt: any) => {
            result = opt;
        }, false));

        const snapshot = await fbl.execute('.', <IFlow> {
            version: '1.0.0',
            pipeline: {
                [DummyActionHandler.ID]: `<%- ctx['t1']["t2"].value %>`
            }
        }, <IContext> {
            ctx: {
                t1: {
                    t2: {
                        value: 'tst'
                    }
                }
            }
        });

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(result, 'tst');
    }
}
