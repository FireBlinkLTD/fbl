import {test, suite} from 'mocha-typescript';
import {ContextValuesAssignmentActionHandler} from '../../../../src/plugins/context/ContextValuesAssignmentActionHandler';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {dump} from 'js-yaml';
import * as assert from 'assert';
import {basename, dirname} from 'path';
import {ActionSnapshot} from '../../../../src/models';
import {FlowService, TempPathsRegistry} from '../../../../src/services';
import {Container} from 'typedi';
import {ContextUtil} from '../../../../src/utils/ContextUtil';

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
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: {}
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                '$.test': []
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                '$.test': 123
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                '$.test': 'tst'
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ContextValuesAssignmentActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate({
                '$.test': {
                    files: ['/tmp/test']
                }
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                '$': {
                    inline: {
                        'test': true
                    }
                }
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                '$.test': {
                    inline: {
                        test: true
                    },
                    files: ['/tmp/test']
                }
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async priorityCheck(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandler = new ContextValuesAssignmentActionHandler();
        const context = ContextUtil.generateEmptyContext();

        const fileContent = {
            content: 'file'
        };

        const inlineContent = {
            content: 'inline'
        };

        const tmpFile = await tempPathsRegistry.createTempFile();

        // write to temp file
        await promisify(writeFile)(tmpFile, dump(fileContent), 'utf8');

        const options = {
            '$': <{[key: string]: any}>{
                inline: inlineContent,
                files: [tmpFile]
            }
        };

        let snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);
        assert.strictEqual(context.ctx.content, 'inline');

        // explicitly set priority to inline
        options['$'].priority = 'inline';

        snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);
        assert.strictEqual(context.ctx.content, 'inline');

        // change priority to files
        options['$'].priority = 'files';

        snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);
        assert.strictEqual(context.ctx.content, 'file');
    }


    @test()
    async assignValues(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const flowService = Container.get(FlowService);
        flowService.debug = true;

        const actionHandler = new ContextValuesAssignmentActionHandler();

        const context = ContextUtil.generateEmptyContext();
        context.ctx.existing = {
            value: 'value'
        };

        const fileContent = {
            file_content: 'ftpo'
        };

        const tmpFile = await tempPathsRegistry.createTempFile();

        // write to temp file
        await promisify(writeFile)(tmpFile, dump(fileContent), 'utf8');

        const options = {
            '$': {
                inline: {
                    test: 123
                }
            },
            '$.existing': {
                inline: {
                    other: 'other'
                },
                override: true
            },
            '$.fromFile': {
                files: [tmpFile]
            }
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);

        assert.strictEqual(context.ctx.test, 123);
        assert.strictEqual(context.ctx.existing.value, undefined);
        assert.strictEqual(context.ctx.existing.other, 'other');
        assert.strictEqual(context.ctx.fromFile.file_content, fileContent.file_content);

        // do the same with relative path
        options['$.fromFile'].files = [basename(tmpFile)];
        snapshot.wd = dirname(tmpFile);

        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);

        assert.strictEqual(context.ctx.test, 123);
        assert.strictEqual(context.ctx.existing.value, undefined);
        assert.strictEqual(context.ctx.existing.other, 'other');
        assert.strictEqual(context.ctx.fromFile.file_content, fileContent.file_content);
    }

    @test()
    async assignRootValues(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandler = new ContextValuesAssignmentActionHandler();

        const context = ContextUtil.generateEmptyContext();
        context.ctx.existing = {
            value: 'value'
        };

        const file1Content = {
            file1_content: 'ftpo1'
        };

        const file2Content = {
            file2_content: 'ftpo2'
        };


        const tmpFile1 = await tempPathsRegistry.createTempFile();
        const tmpFile2 = await tempPathsRegistry.createTempFile();

        // write to temp files
        await promisify(writeFile)(tmpFile1, dump(file1Content), 'utf8');
        await promisify(writeFile)(tmpFile2, dump(file2Content), 'utf8');

        const options = {
            '$': {
                inline: {
                    test: 123
                }
            },
            '$.fromFile': {
                files: [
                    tmpFile1,
                    tmpFile2
                ]
            }
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);

        assert.strictEqual(context.ctx.test, 123);
        assert.strictEqual(context.ctx.existing.value, 'value');
        assert.strictEqual(context.ctx.fromFile.file1_content, file1Content.file1_content);
        assert.strictEqual(context.ctx.fromFile.file2_content, file2Content.file2_content);

        // do the same with relative path
        options['$.fromFile'].files = [
            basename(tmpFile1),
            tmpFile2
        ];
        snapshot.wd = dirname(tmpFile1);

        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);

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
                    test: 123
                }
            }
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await actionHandler.validate(options, context, snapshot);

        await chai.expect(
            actionHandler.execute(options, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async failToAssignDueToWrongFileStructure(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandler = new ContextValuesAssignmentActionHandler();
        const context = ContextUtil.generateEmptyContext();

        const fileContent = [{
            file_content: 'ftpo2'
        }];

        const tmpFile = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(tmpFile, dump(fileContent), 'utf8');

        const options = {
            '$.fromFile': {
                files: [
                    tmpFile
                ]
            }
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await actionHandler.validate(options, context, snapshot);

        await chai.expect(
            actionHandler.execute(options, context, snapshot)
        ).to.be.rejected;
    }
}
