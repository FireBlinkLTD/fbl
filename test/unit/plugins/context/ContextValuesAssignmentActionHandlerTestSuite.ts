import { test, suite } from 'mocha-typescript';
import { ContextValuesAssignmentActionHandler } from '../../../../src/plugins/context/ContextValuesAssignmentActionHandler';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { dump } from 'js-yaml';
import * as assert from 'assert';
import { basename, dirname } from 'path';
import { ActionSnapshot } from '../../../../src/models';
import { FlowService, TempPathsRegistry } from '../../../../src/services';
import { Container } from 'typedi';
import { ContextUtil } from '../../../../src/utils';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
export class ContextValuesAssignmentActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ContextValuesAssignmentActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.validate([], context, snapshot, {})).to.be.rejected;

        await chai.expect(actionHandler.validate({}, context, snapshot, {})).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    test: {},
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    '$.test': [],
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    '$.test': 123,
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    '$.test': 'tst',
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ContextValuesAssignmentActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate(
                {
                    '$.test': {
                        files: ['/tmp/test'],
                    },
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    $: {
                        inline: {
                            test: true,
                        },
                    },
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    '$.test': {
                        inline: {
                            test: true,
                        },
                        files: ['/tmp/test'],
                    },
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.not.rejected;
    }

    @test()
    async priorityCheck(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandler = new ContextValuesAssignmentActionHandler();
        const context = ContextUtil.generateEmptyContext();

        const fileContent = {
            content: 'file',
        };

        const inlineContent = {
            content: 'inline',
        };

        const tmpFile = await tempPathsRegistry.createTempFile();

        // write to temp file
        await promisify(writeFile)(tmpFile, dump(fileContent), 'utf8');

        const options = {
            $: <{ [key: string]: any }>{
                inline: inlineContent,
                files: [tmpFile],
            },
        };

        let snapshot = new ActionSnapshot('.', {}, '', 0, {});
        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});
        assert.strictEqual(context.ctx.content, 'inline');

        // explicitly set priority to inline
        options['$'].priority = 'inline';

        snapshot = new ActionSnapshot('.', {}, '', 0, {});
        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});
        assert.strictEqual(context.ctx.content, 'inline');

        // change priority to files
        options['$'].priority = 'files';

        snapshot = new ActionSnapshot('.', {}, '', 0, {});
        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});
        assert.strictEqual(context.ctx.content, 'file');
    }

    @test()
    async assignValues(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new ContextValuesAssignmentActionHandler();

        const context = ContextUtil.generateEmptyContext();
        context.ctx.existing = {
            value: 'value',
        };

        context.ctx.toRemove = 'field';

        const fileContent1 = {
            file_content: '<%- "ft" %><$- "po" $>',
        };

        const fileContent2 = [1, 2, 3];

        const tmpFile1 = await tempPathsRegistry.createTempFile();
        const tmpFile2 = await tempPathsRegistry.createTempFile();

        // write to temp file
        await promisify(writeFile)(tmpFile1, dump(fileContent1), 'utf8');
        await promisify(writeFile)(tmpFile2, dump(fileContent2), 'utf8');

        const options: any = {
            $: {
                inline: {
                    test: 123,
                },
            },
            '$.toRemove': {
                inline: null,
                override: true,
            },
            '$.inlineArray': {
                inline: [1, 2, 3],
            },
            '$.inlineNumber': {
                inline: 1,
            },
            '$.inlineBooleanTrue': {
                inline: true,
            },
            '$.inlineBooleanFalse': {
                inline: false,
            },
            '$.inlineString': {
                inline: 'test',
            },
            '$.existing': {
                inline: {
                    other: 'other',
                },
                override: true,
            },
            '$.fromFile1': {
                files: [tmpFile1],
            },
            '$.fromFile2': {
                files: [tmpFile2],
            },
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.strictEqual(context.ctx.test, 123);
        assert.strictEqual(context.ctx.existing.value, undefined);
        assert.strictEqual(context.ctx.existing.other, 'other');
        assert.strictEqual(context.ctx.inlineArray, options['$.inlineArray'].inline);
        assert.strictEqual(context.ctx.inlineNumber, options['$.inlineNumber'].inline);
        assert.strictEqual(context.ctx.inlineString, options['$.inlineString'].inline);
        assert.strictEqual(context.ctx.inlineBooleanTrue, true);
        assert.strictEqual(context.ctx.inlineBooleanFalse, false);
        assert.deepStrictEqual(context.ctx.fromFile1.file_content, 'ftpo');
        assert.deepStrictEqual(context.ctx.fromFile2, fileContent2);
        assert.strictEqual(context.ctx.toRemove, null);

        // do the same with relative path
        options['$.fromFile1'].files = [basename(tmpFile1)];
        snapshot.wd = dirname(tmpFile1);

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.strictEqual(context.ctx.test, 123);
        assert.strictEqual(context.ctx.existing.value, undefined);
        assert.strictEqual(context.ctx.existing.other, 'other');
        assert.strictEqual(context.ctx.inlineArray, options['$.inlineArray'].inline);
        assert.strictEqual(context.ctx.inlineNumber, options['$.inlineNumber'].inline);
        assert.strictEqual(context.ctx.inlineString, options['$.inlineString'].inline);
        assert.strictEqual(context.ctx.inlineBooleanTrue, true);
        assert.strictEqual(context.ctx.inlineBooleanFalse, false);
        assert.deepStrictEqual(context.ctx.fromFile1.file_content, 'ftpo');
        assert.deepStrictEqual(context.ctx.fromFile2, fileContent2);
    }

    @test()
    async assignRootValues(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandler = new ContextValuesAssignmentActionHandler();

        const context = ContextUtil.generateEmptyContext();
        context.ctx.existing = {
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
                    test: 123,
                },
            },
            '$.fromFile': {
                files: [tmpFile1, tmpFile2],
            },
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.strictEqual(context.ctx.test, 123);
        assert.strictEqual(context.ctx.existing.value, 'value');
        assert.strictEqual(context.ctx.fromFile.file1_content, file1Content.file1_content);
        assert.strictEqual(context.ctx.fromFile.file2_content, file2Content.file2_content);

        // do the same with relative path
        options['$.fromFile'].files = [basename(tmpFile1), tmpFile2];
        snapshot.wd = dirname(tmpFile1);

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.strictEqual(context.ctx.test, 123);
        assert.strictEqual(context.ctx.existing.value, 'value');
        assert.strictEqual(context.ctx.fromFile.file1_content, file1Content.file1_content);
        assert.strictEqual(context.ctx.fromFile.file2_content, file2Content.file2_content);
    }

    @test()
    async failToAssignDueToConflictInPath(): Promise<void> {
        const actionHandler = new ContextValuesAssignmentActionHandler();

        const context = ContextUtil.generateEmptyContext();
        context.ctx.value = 'value';

        const options = {
            '$.value': {
                inline: {
                    test: 123,
                },
            },
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate(options, context, snapshot, {});

        await chai.expect(actionHandler.execute(options, context, snapshot, {})).to.be.rejected;
    }

    @test()
    async failToAssignToRootBasicValue(): Promise<void> {
        const actionHandler = new ContextValuesAssignmentActionHandler();

        const context = ContextUtil.generateEmptyContext();

        const options = {
            $: {
                inline: 123,
            },
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.validate(options, context, snapshot, {})).to.be.rejected;
    }

    @test()
    async pushToArray(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandler = new ContextValuesAssignmentActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.existing1 = [1, 2];
        context.ctx.existing2 = [1, 2];
        context.ctx.existing3 = [1, 2];

        const file = await tempPathsRegistry.createTempFile();
        const content = [5, 6];

        await promisify(writeFile)(file, dump(content), 'utf8');

        const options = {
            '$.new': {
                inline: 123,
                push: true,
            },

            '$.children': {
                inline: [1, 2],
                push: true,
                children: true,
            },

            '$.existing1': {
                inline: [3, 4],
                push: true,
            },

            '$.existing2': {
                inline: [3, 4],
                push: true,
                override: true,
            },

            '$.existing3': {
                inline: [3, 4],
                push: true,
                children: true,
            },

            '$.fromFile1': {
                files: [file],
                push: true,
            },

            '$.fromFile2': {
                files: [file],
                push: true,
                children: true,
            },

            '$.combined1': {
                inline: [1, 2],
                files: [file],
                push: true,
            },

            '$.combined2': {
                inline: [1, 2],
                files: [file],
                push: true,
                children: true,
                priority: 'files',
            },

            '$.combined3': {
                inline: [1, 2],
                files: [file],
                push: true,
                children: true,
                priority: 'inline',
            },
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.deepStrictEqual(context.ctx.children, [1, 2]);
        assert.deepStrictEqual(context.ctx.existing1, [1, 2, [3, 4]]);
        assert.deepStrictEqual(context.ctx.existing2, [[3, 4]]);
        assert.deepStrictEqual(context.ctx.existing3, [1, 2, 3, 4]);
        assert.deepStrictEqual(context.ctx.new, [123]);
        assert.deepStrictEqual(context.ctx.fromFile1, [[5, 6]]);
        assert.deepStrictEqual(context.ctx.fromFile2, [5, 6]);
        assert.deepStrictEqual(context.ctx.combined1, [[5, 6], [1, 2]]);
        assert.deepStrictEqual(context.ctx.combined2, [1, 2, 5, 6]);
        assert.deepStrictEqual(context.ctx.combined3, [5, 6, 1, 2]);
    }
}
