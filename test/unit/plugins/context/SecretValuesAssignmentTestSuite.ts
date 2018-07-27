import {test, suite} from 'mocha-typescript';
import {SecretValuesAssignment} from '../../../../src/plugins/context/SecretValuesAssignment';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {dump} from 'js-yaml';
import * as assert from 'assert';
import {basename, dirname} from 'path';
import {ActionSnapshot} from '../../../../src/models';
import {Container} from 'typedi';
import {ActionHandlersRegistry, FlowService} from '../../../../src/services';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

@suite()
export class SecretValuesAssignmentTestSuite {

    after() {
        Container.get(ActionHandlersRegistry).cleanup();
        Container.remove(FlowService);
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new SecretValuesAssignment();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

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
                test: 'tst'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: {
                    inline: 'test',
                    file: '/tmp/test'
                }
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new SecretValuesAssignment();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await chai.expect(
            actionHandler.validate({
                test: {
                    inline: 'test'
                }
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                test: {
                    file: '/tmp/test'
                }
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async assignValues(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);
        const actionHandler = new SecretValuesAssignment();

        flowService.debug = true;

        actionHandlersRegistry.register(actionHandler);

        const context = FlowService.generateEmptyContext();
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
            test: {
                inline: 123
            },
            existing: {
                inline: {
                    other: 'other'
                }
            },
            fromFile: {
                file: tmpFile.path
            }
        };

        let snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, options, context);

        assert.strictEqual(context.secrets.test, 123);
        assert.strictEqual(context.secrets.existing.value, undefined);
        assert.strictEqual(context.secrets.existing.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file_content, fileContent.file_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);

        // do the same with relative path
        options.fromFile.file = basename(tmpFile.path);

        snapshot = await flowService.executeAction(dirname(tmpFile.path), actionHandler.getMetadata().id, options, context);

        assert.strictEqual(context.secrets.test, 123);
        assert.strictEqual(context.secrets.existing.value, undefined);
        assert.strictEqual(context.secrets.existing.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file_content, fileContent.file_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);
    }

    @test()
    async assignRootValues(): Promise<void> {
        const flowService = Container.get(FlowService);
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);
        const actionHandler = new SecretValuesAssignment();

        flowService.debug = true;

        actionHandlersRegistry.register(actionHandler);

        const context = FlowService.generateEmptyContext();
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
            test: {
                inline: 123
            },
            '.': {
                inline: {
                    other: 'other'
                }
            },
            fromFile: {
                file: tmpFile.path
            }
        };

        let snapshot = await flowService.executeAction('.', actionHandler.getMetadata().id, options, context);

        assert.strictEqual(context.secrets.test, 123);
        assert.strictEqual(context.secrets.existing.value, 'value');
        assert.strictEqual(context.secrets.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file_content, fileContent.file_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);

        // do the same with relative path
        options.fromFile.file = basename(tmpFile.path);

        snapshot = await flowService.executeAction(dirname(tmpFile.path), actionHandler.getMetadata().id, options, context);

        assert.strictEqual(context.secrets.test, 123);
        assert.strictEqual(context.secrets.existing.value, 'value');
        assert.strictEqual(context.secrets.other, 'other');
        assert.strictEqual(context.secrets.fromFile.file_content, fileContent.file_content);
        assert.strictEqual(snapshot.getSteps().find(s => s.type === 'options').payload, FlowService.MASKED);
    }
}
