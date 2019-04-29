import { suite, test } from 'mocha-typescript';
import { Container } from 'typedi';
import { IActionHandlerMetadata, IFlow, IPlugin } from '../../../src/interfaces';
import { ActionHandler, ActionSnapshot } from '../../../src/models';
import * as assert from 'assert';
import { FBLService } from '../../../src/services';
import { ContextUtil } from '../../../src/utils';
import { join } from 'path';
import { DummyActionHandler } from '../../assets/fakePlugins/DummyActionHandler';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const version = require('../../../package.json').version;

class InvalidIdActionHandler extends ActionHandler {
    getMetadata(): IActionHandlerMetadata {
        return <IActionHandlerMetadata>{
            id: FBLService.METADATA_PREFIX + 'invalid',
            version: '1.0.0',
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        return;
    }
}

class InvalidAliasActionHandler extends ActionHandler {
    getMetadata(): IActionHandlerMetadata {
        return <IActionHandlerMetadata>{
            id: 'valid',
            version: '1.0.0',
            aliases: [FBLService.METADATA_PREFIX + 'invalid.alias'],
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        return;
    }
}

@suite()
export class FBLServiceTestSuite {
    @test()
    async pluginAutoInclude(): Promise<void> {
        const fbl = Container.get<FBLService>(FBLService);
        await fbl.validateFlowRequirements(
            <IFlow>{
                version: '1.0.0',
                pipeline: {
                    test: 'tst',
                },
                requires: {
                    plugins: {
                        [join(__dirname, '../../../src/plugins/context')]: version,
                    },
                },
            },
            '.',
        );

        const plugin = fbl.getPlugin('flb.core.context');
        assert(plugin);
    }

    @test()
    async pluginAutoIncludeWithWD(): Promise<void> {
        const fbl = Container.get<FBLService>(FBLService);
        await fbl.validateFlowRequirements(
            <IFlow>{
                version: '1.0.0',
                pipeline: {
                    test: 'tst',
                },
                requires: {
                    plugins: {
                        ['context']: version,
                    },
                },
            },
            join(__dirname, '../../../src/plugins'),
        );

        const plugin = fbl.getPlugin('flb.core.context');
        assert(plugin);
    }

    @test()
    async extractIdOrAliasMissingKey(): Promise<void> {
        let error;
        try {
            FBLService.extractIdOrAlias({
                $title: 'test',
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
        const actionHandler = new DummyActionHandler();
        actionHandler.executeFn = async (opt: any) => {
            result = opt;
        };

        fbl.flowService.actionHandlersRegistry.register(actionHandler, {
            name: 'test',
            version: '1.0.0',
            requires: {
                fbl: '>=0.0.0',
            },
        });

        const context = ContextUtil.generateEmptyContext();
        context.ctx.var = 'test';
        context.secrets.var = '123';

        const snapshot = await fbl.execute(
            '.',
            <IFlow>{
                version: '1.0.0',
                pipeline: {
                    $title: 'Dummy Action Handler',
                    [actionHandler.id]: '<%- ctx.var %><%- secrets.var %>',
                },
            },
            context,
            {},
        );

        const snapshotOptionsSteps = snapshot.getSteps().filter(s => s.type === 'options');
        assert.strictEqual(snapshotOptionsSteps[snapshotOptionsSteps.length - 1].payload, 'test{MASKED}');
        assert.strictEqual(result, 'test123');

        await chai.expect(
            fbl.execute(
                '.',
                <IFlow>{
                    version: '1.0.0',
                    pipeline: {},
                },
                ContextUtil.generateEmptyContext(),
                {},
            ),
        ).to.be.rejected;
    }

    @test()
    async skippedExecution(): Promise<void> {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        const actionHandler = new DummyActionHandler();
        actionHandler.executeFn = async (opt: any) => {
            result = opt;
        };
        actionHandler.shouldSkipExecution = true;

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(actionHandler, {
            name: 'test',
            version: '1.0.0',
            requires: {
                fbl: '>=0.0.0',
            },
        });

        await fbl.execute(
            '.',
            <IFlow>{
                version: '1.0.0',
                pipeline: {
                    [actionHandler.id]: 'tst',
                },
            },
            ContextUtil.generateEmptyContext(),
            {},
        );

        assert.strictEqual(result, null);
    }

    @test
    async failedExecution() {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        const actionHandler = new DummyActionHandler();
        actionHandler.executeFn = async (opt: any) => {
            throw new Error('test');
        };

        fbl.flowService.actionHandlersRegistry.register(actionHandler, {
            name: 'test',
            version: '1.0.0',
            requires: {
                fbl: '>=0.0.0',
            },
        });

        const snapshot = await fbl.execute(
            '.',
            <IFlow>{
                version: '1.0.0',
                pipeline: {
                    [actionHandler.id]: 'tst',
                },
            },
            ContextUtil.generateEmptyContext(),
            {},
        );

        assert.strictEqual(snapshot.successful, false);
    }

    @test()
    async ejsTemplateValidation() {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        const actionHandler = new DummyActionHandler();
        actionHandler.executeFn = async (opt: any) => {
            result = opt;
        };

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(actionHandler, {
            name: 'test',
            version: '1.0.0',
            requires: {
                fbl: '>=0.0.0',
            },
        });

        const snapshot = await fbl.execute(
            '.',
            <IFlow>{
                version: '1.0.0',
                pipeline: {
                    [actionHandler.id]: `<%- ctx.t1`,
                },
            },
            ContextUtil.generateEmptyContext(),
            {},
        );

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(
            snapshot.getSteps().find(s => s.type === 'failure').payload,
            'Error: Could not find matching close tag for "<%-".',
        );
        assert.strictEqual(result, null);
    }

    @test()
    async failActionIdAndAliasValidation() {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        let error;
        try {
            fbl.registerPlugins([
                <IPlugin>{
                    name: 'invalid_id',
                    version: '1.0.0',
                    requires: {
                        fbl: require('../../../package.json').version,
                    },
                    actionHandlers: [new InvalidIdActionHandler()],
                },
            ]);
        } catch (e) {
            error = e;
        }

        assert.strictEqual(
            error.message,
            `Unable to register action handler with id "${
                new InvalidIdActionHandler().getMetadata().id
            }". It can not start with ${FBLService.METADATA_PREFIX}`,
        );

        error = undefined;
        try {
            fbl.registerPlugins([
                <IPlugin>{
                    name: 'invalid_alias',
                    version: '1.0.0',
                    requires: {
                        fbl: version,
                    },
                    actionHandlers: [new InvalidAliasActionHandler()],
                },
            ]);
        } catch (e) {
            error = e;
        }

        assert.strictEqual(
            error.message,
            `Unable to register action handler with alias "${
                new InvalidAliasActionHandler().getMetadata().aliases[0]
            }". It can not start with ${FBLService.METADATA_PREFIX}`,
        );
    }

    @test()
    async templateProcessingStringEscape() {
        const fbl = Container.get<FBLService>(FBLService);

        fbl.flowService.debug = true;

        const actionHandler = new DummyActionHandler();
        actionHandler.executeFn = async (opt: any) => {
            result = opt;
        };

        let result = null;
        fbl.flowService.actionHandlersRegistry.register(actionHandler, {
            name: 'test',
            version: '1.0.0',
            requires: {
                fbl: '>=0.0.0',
            },
        });

        const context = ContextUtil.generateEmptyContext();
        context.ctx.t1 = {
            t2: {
                value: 'tst',
            },
        };

        const snapshot = await fbl.execute(
            '.',
            <IFlow>{
                version: '1.0.0',
                pipeline: {
                    [actionHandler.id]: `<%- ctx['t1']["t2"].value %>`,
                },
            },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(result, 'tst');
    }

    @test()
    async missingApplicationRequirement() {
        const fbl = Container.get<FBLService>(FBLService);

        await chai
            .expect(
                fbl.validatePlugin(
                    <IPlugin>{
                        name: 'test',
                        version: '0.0.0',
                        requires: {
                            fbl: version,
                            applications: ['missing_app_1234'],
                        },
                    },
                    '.',
                ),
            )
            .to.be.rejectedWith(
                'Application missing_app_1234 required by plugin test not found, make sure it is installed and its location presents in the PATH environment variable',
            );
    }
}
