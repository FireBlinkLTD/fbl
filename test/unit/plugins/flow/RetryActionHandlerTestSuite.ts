import { suite, test } from 'mocha-typescript';
import { ActionHandlersRegistry, FlowService } from '../../../../src/services';
import { ActionSnapshot } from '../../../../src/models';
import { RetryActionHandler } from '../../../../src/plugins/flow/RetryActionHandler';
import { IPlugin } from '../../../../src/interfaces';
import { Container } from 'typedi';
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
class RetryActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new RetryActionHandler();
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
                        retry: {
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
        const actionHandler = new RetryActionHandler();
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
                    attempts: 5,
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async executeWithSuccessfulOnASecondRetry(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler();
        let count = 0;
        let second = false;

        dummyActionHandler.executeFn = async () => {
            if (count === 0) {
                count++;
                throw new Error('Test');
            }

            second = true;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new RetryActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            attempts: 2,
            action: {
                [dummyActionHandler.id]: {},
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, true);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(second, true);
        assert.strictEqual(snapshot.ignoreChildFailure, true);
    }

    @test()
    async executeWithFailureOnASecondRetry(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler();
        let count = 0;
        dummyActionHandler.executeFn = async () => {
            count++;
            throw new ActionError('Test', 'TEST');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new RetryActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            attempts: 2,
            action: {
                [dummyActionHandler.id]: {},
            },
            errorCode: {
                assignTo: '$.ctx.errorCode',
                pushTo: '$.ctx.errorCodes',
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.ignoreChildFailure, false);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(count, 2);

        assert.strictEqual(context.ctx.errorCode, 'TEST');
        assert.deepStrictEqual(context.ctx.errorCodes, ['TEST']);
    }

    @test()
    async executeWithFailureOnAThirdRetry(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler();
        let count = 0;
        dummyActionHandler.executeFn = async () => {
            count++;
            throw new Error('Test');
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const actionHandler = new RetryActionHandler();
        actionHandlersRegistry.register(actionHandler, plugin);

        const options = {
            attempts: 2,
            action: {
                [dummyActionHandler.id]: {},
            },
            errorCode: {
                assignTo: '$.ctx.errorCode',
                pushTo: '$.ctx.errorCodes',
            },
        };

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            'index.yml',
            '.',
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(snapshot.successful, false);
        assert.strictEqual(snapshot.ignoreChildFailure, false);
        assert.strictEqual(snapshot.childFailure, true);
        assert.strictEqual(count, 2);

        assert.strictEqual(context.ctx.errorCode, UNEXPECTED);
        assert.deepStrictEqual(context.ctx.errorCodes, [UNEXPECTED]);
    }
}
