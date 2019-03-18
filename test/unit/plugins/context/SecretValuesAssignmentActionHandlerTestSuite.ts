import { test, suite } from 'mocha-typescript';
import { SecretValuesAssignmentActionHandler } from '../../../../src/plugins/context/SecretValuesAssignmentActionHandler';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { dump } from 'js-yaml';
import * as assert from 'assert';
import { basename, dirname } from 'path';
import { ActionSnapshot } from '../../../../src/models';
import { Container } from 'typedi';
import { ActionHandlersRegistry, FlowService, TempPathsRegistry } from '../../../../src/services';
import { ContextUtil } from '../../../../src/utils';
import { IPlugin } from '../../../../src/interfaces';

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
export class SecretValuesAssignmentActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new SecretValuesAssignmentActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        test: {},
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
                        test: [],
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
                        test: 123,
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
                        '$.test': 'tst',
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
        const actionHandler = new SecretValuesAssignmentActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    $: {
                        inline: {
                            test: 'test',
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
                    '$.test': {
                        files: ['/tmp/test'],
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
                    $: {
                        inline: {
                            test: true,
                        },
                        files: ['/tmp/test'],
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async assignValues(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);
        const actionHandler = new SecretValuesAssignmentActionHandler();

        flowService.debug = true;

        actionHandlersRegistry.register(actionHandler, plugin);

        const context = ContextUtil.generateEmptyContext();
        context.secrets.existing = {
            value: 'value',
        };

        const fileContent = {
            file_content: 'ftpo',
        };

        const tmpFile = await tempPathsRegistry.createTempFile();

        // write to temp file
        await promisify(writeFile)(tmpFile, dump(fileContent), 'utf8');

        const options = {
            $: {
                inline: {
                    test: 123,
                },
            },
            '$.existing': {
                inline: {
                    other: 'other',
                },
            },
            '$.fromFile': {
                files: [tmpFile],
            },
        };

        let snapshot = await flowService.executeAction('.', { [actionHandler.getMetadata().id]: options }, context, {});

        assert.strictEqual(context.secrets.test, 123);
        assert.strictEqual(context.secrets.existing.value, 'value');
        assert.strictEqual(context.secrets.existing.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file_content, fileContent.file_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);

        // do the same with relative path
        options['$.fromFile'].files = [basename(tmpFile)];

        snapshot = await flowService.executeAction(
            dirname(tmpFile),
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(context.secrets.test, 123);
        assert.strictEqual(context.secrets.existing.value, 'value');
        assert.strictEqual(context.secrets.existing.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file_content, fileContent.file_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);
    }

    @test()
    async assignRootValues(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);
        const actionHandler = new SecretValuesAssignmentActionHandler();

        flowService.debug = true;

        actionHandlersRegistry.register(actionHandler, plugin);

        const context = ContextUtil.generateEmptyContext();
        context.secrets.existing = {
            value: 'value',
        };

        const file1Content = {
            file1_content: 'ftpo1',
        };

        const file2Content = {
            file2_content: 'ftpo2',
        };
        const tmpFile1 = await tempPathsRegistry.createTempFile();
        const tmpFile2 = await tempPathsRegistry.createTempFile();

        // write to temp files
        await promisify(writeFile)(tmpFile1, dump(file1Content), 'utf8');
        await promisify(writeFile)(tmpFile2, dump(file2Content), 'utf8');

        const options = {
            $: {
                inline: {
                    other: 'other',
                },
            },
            '$.fromFile': {
                files: [tmpFile1, tmpFile2],
            },
        };

        let snapshot = await flowService.executeAction('.', { [actionHandler.getMetadata().id]: options }, context, {});

        assert.strictEqual(context.secrets.existing.value, 'value');
        assert.strictEqual(context.secrets.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file1_content, file1Content.file1_content);
        assert.strictEqual(context.secrets.fromFile.file2_content, file2Content.file2_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);

        // do the same with relative path
        options['$.fromFile'].files = [basename(tmpFile1), tmpFile2];

        snapshot = await flowService.executeAction(
            dirname(tmpFile1),
            { [actionHandler.getMetadata().id]: options },
            context,
            {},
        );

        assert.strictEqual(context.secrets.existing.value, 'value');
        assert.strictEqual(context.secrets.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file1_content, file1Content.file1_content);
        assert.strictEqual(context.secrets.fromFile.file2_content, file2Content.file2_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);
    }
}
