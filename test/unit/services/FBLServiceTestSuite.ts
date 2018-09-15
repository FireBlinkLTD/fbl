import {suite, test} from 'mocha-typescript';
import {Container} from 'typedi';
import {IActionHandlerMetadata, IFlow, IPlugin} from '../../../src/interfaces';
import {ActionHandler, ActionSnapshot} from '../../../src/models';
import * as assert from 'assert';
import {FBLService, FlowService} from '../../../src/services';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

class DummyActionHandler extends ActionHandler {
    static ID = 'testHandler';

    constructor(
        private fn: Function,
        private skipExecution: boolean
    ) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return  <IActionHandlerMetadata> {
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

class InvalidIdActionHandler extends ActionHandler {
    getMetadata(): IActionHandlerMetadata {
        return  <IActionHandlerMetadata> {
            id: FBLService.METADATA_PREFIX + 'invalid',
            version: '1.0.0'
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        return;
    }
}

class InvalidAliasActionHandler extends ActionHandler {
    getMetadata(): IActionHandlerMetadata {
        return  <IActionHandlerMetadata> {
            id: 'valid',
            version: '1.0.0',
            aliases: [
                FBLService.METADATA_PREFIX + 'invalid.alias'
            ]
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        return;
    }
}

@suite()
export class FBLServiceTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async extractIdOrAliasMissingKey(): Promise<void> {
        let error;
        try {
            FBLService.extractIdOrAlias({
                $title: 'test'
            });
        } catch (e) {
            error = e;
        }

        assert.strictEqual(error.message, 'Unable to extract id or alias from keys: $title');
    }

    @test()
    async pipeline(): Promise<void> {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(new DummyActionHandler(async (opt: any) => {
            result = opt;
        }, false));

        const context = FlowService.generateEmptyContext();
        context.ctx.var = 'test';
        context.secrets.var = '123';

        const snapshot = await fbl.execute('.', <IFlow> {
            version: '1.0.0',
            pipeline: {
                $title: 'Dummy Action Handler',
                [DummyActionHandler.ID]: '<%- ctx.var %><%- secrets.var %>'
            }
        }, context);

        const snapshotOptionsSteps = snapshot.getSteps().filter(s => s.type === 'options');
        const contextOptionsSteps = snapshot.getSteps().filter(s => s.type === 'context');
        assert.strictEqual(snapshotOptionsSteps[snapshotOptionsSteps.length - 1].payload, 'test{MASKED}');
        assert.deepStrictEqual(contextOptionsSteps[contextOptionsSteps.length - 1].payload, {
            ctx: context.ctx,
            entities: context.entities
        });
        assert.strictEqual(result, 'test123');

        await chai.expect(fbl.execute(
            '.',
            <IFlow> {
                version: '1.0.0',
                pipeline: {}
            },
            FlowService.generateEmptyContext())
        ).to.be.rejected;
    }

    @test()
    async skippedExecution(): Promise<void> {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(new DummyActionHandler(async (opt: any) => {
            result = opt;
        }, true));

        await fbl.execute(
            '.',
            <IFlow> {
                version: '1.0.0',
                pipeline: {
                    [DummyActionHandler.ID]: 'tst'
                }
            },
            FlowService.generateEmptyContext()
        );

        assert.strictEqual(result, null);
    }

    @test
    async failedExecution() {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        fbl.flowService.actionHandlersRegistry.register(new DummyActionHandler(async (opt: any) => {
            throw new Error('test');
        }, false));

        const snapshot = await fbl.execute(
            '.',
            <IFlow> {
                version: '1.0.0',
                pipeline: {
                    [DummyActionHandler.ID]: 'tst'
                }
            },
            FlowService.generateEmptyContext()
        );

        assert.strictEqual(snapshot.successful, false);
    }

    @test()
    async ejsTemplateValidation() {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(new DummyActionHandler(async (opt: any) => {
            result = opt;
        }, false));

        const snapshot = await fbl.execute(
            '.',
            <IFlow> {
                version: '1.0.0',
                pipeline: {
                    [DummyActionHandler.ID]: `<%- ctx.t1`
                }
            },
            FlowService.generateEmptyContext()
        );

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'failure').payload, 'Error: Could not find matching close tag for "<%-".');
        assert.strictEqual(result, null);
    }


    @test()
    async failActionIdAndAliasValidation() {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        let error;
        try {
            fbl.registerPlugins([
                <IPlugin> {
                    name: 'invalid_id',
                    version: '1.0.0',
                    requires: {
                        fbl: require('../../../../package.json').version
                    },
                    actionHandlers: [
                        new InvalidIdActionHandler()
                    ]
                }
            ]);
        } catch (e) {
            error = e;
        }

        assert.strictEqual(error.message, `Unable to register action handler with id "${new InvalidIdActionHandler().getMetadata().id}". It can not start with ${FBLService.METADATA_PREFIX}`);

        error = undefined;
        try {
            fbl.registerPlugins([
                <IPlugin> {
                    name: 'invalid_alias',
                    version: '1.0.0',
                    requires: {
                        fbl: require('../../../../package.json').version
                    },
                    actionHandlers: [
                        new InvalidAliasActionHandler()
                    ]
                }
            ]);
        } catch (e) {
            error = e;
        }

        assert.strictEqual(error.message, `Unable to register action handler with alias "${new InvalidAliasActionHandler().getMetadata().aliases[0]}". It can not start with ${FBLService.METADATA_PREFIX}`);
    }

    @test()
    async templateProcessingStringEscape() {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(new DummyActionHandler(async (opt: any) => {
            result = opt;
        }, false));

        const context = FlowService.generateEmptyContext();
        context.ctx.t1 = {
            t2: {
                value: 'tst'
            }
        };

        const snapshot = await fbl.execute(
            '.',
            <IFlow> {
                version: '1.0.0',
                pipeline: {
                    [DummyActionHandler.ID]: `<%- ctx['t1']["t2"].value %>`
                }
            },
            context
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(result, 'tst');
    }
}
