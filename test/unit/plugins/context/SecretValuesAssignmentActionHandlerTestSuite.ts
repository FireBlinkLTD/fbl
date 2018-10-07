import {test, suite} from 'mocha-typescript';
import {SecretValuesAssignmentActionHandler} from '../../../../src/plugins/context/SecretValuesAssignmentActionHandler';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {dump} from 'js-yaml';
import * as assert from 'assert';
import {basename, dirname} from 'path';
import {ActionSnapshot} from '../../../../src/models';
import {Container} from 'typedi';
import {ActionHandlersRegistry, FlowService} from '../../../../src/services';
import {ContextUtil} from '../../../../src/utils/ContextUtil';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

@suite()
export class SecretValuesAssignmentActionHandlerTestSuite {

    after() {
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new SecretValuesAssignmentActionHandler();
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
                test: []
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 123
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
        const actionHandler = new SecretValuesAssignmentActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate({
                '$': {
                    inline: {
                        test: 'test'
                    }
                }
            }, context, snapshot)
        ).to.be.not.rejected;

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
                        test: true
                    },
                    files: ['/tmp/test']
                }
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async assignValues(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);
        const actionHandler = new SecretValuesAssignmentActionHandler();

        flowService.debug = true;

        actionHandlersRegistry.register(actionHandler);

        const context = ContextUtil.generateEmptyContext();
        context.secrets.existing = {
            value: 'value'
        };

        const fileContent = {
            file_content: 'ftpo'
        };

        const tmpFile = await tmp.file();

        // write to temp file
        await promisify(writeFile)(tmpFile.path, dump(fileContent), 'utf8');

        const options = {
            '$': {
                inline: {
                    test: 123
                }
            },
            '$.existing': {
                inline: {
                    other: 'other'
                }
            },
            '$.fromFile': {
                files: [tmpFile.path]
            }
        };

        let snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context);

        assert.strictEqual(context.secrets.test, 123);
        assert.strictEqual(context.secrets.existing.value, 'value');
        assert.strictEqual(context.secrets.existing.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file_content, fileContent.file_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);

        // do the same with relative path
        options['$.fromFile'].files = [basename(tmpFile.path)];

        snapshot = await flowService.executeAction(dirname(tmpFile.path), actionHandler.getMetadata().id, {}, options, context);

        assert.strictEqual(context.secrets.test, 123);
        assert.strictEqual(context.secrets.existing.value, 'value');
        assert.strictEqual(context.secrets.existing.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file_content, fileContent.file_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);
    }

    @test()
    async assignRootValues(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);
        const actionHandler = new SecretValuesAssignmentActionHandler();

        flowService.debug = true;

        actionHandlersRegistry.register(actionHandler);

        const context = ContextUtil.generateEmptyContext();
        context.secrets.existing = {
            value: 'value'
        };

        const file1Content = {
            file1_content: 'ftpo1'
        };

        const file2Content = {
            file2_content: 'ftpo2'
        };
        const tmpFile1 = await tmp.file();
        const tmpFile2 = await tmp.file();

        // write to temp files
        await promisify(writeFile)(tmpFile1.path, dump(file1Content), 'utf8');
        await promisify(writeFile)(tmpFile2.path, dump(file2Content), 'utf8');

        const options = {
            '$': {
                inline: {
                    other: 'other'
                }
            },
            '$.fromFile': {
                files: [
                    tmpFile1.path,
                    tmpFile2.path
                ]
            }
        };

        let snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, {}, options, context);

        assert.strictEqual(context.secrets.existing.value, 'value');
        assert.strictEqual(context.secrets.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file1_content, file1Content.file1_content);
        assert.strictEqual(context.secrets.fromFile.file2_content, file2Content.file2_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);

        // do the same with relative path
        options['$.fromFile'].files = [
            basename(tmpFile1.path),
            tmpFile2.path
        ];

        snapshot = await flowService.executeAction(dirname(tmpFile1.path), actionHandler.getMetadata().id, {}, options, context);

        assert.strictEqual(context.secrets.existing.value, 'value');
        assert.strictEqual(context.secrets.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file1_content, file1Content.file1_content);
        assert.strictEqual(context.secrets.fromFile.file2_content, file2Content.file2_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);
    }
}
