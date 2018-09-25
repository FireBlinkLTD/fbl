import {suite, test} from 'mocha-typescript';
import {WriteToFileActionHandler} from '../../../../src/plugins/fs/WriteToFileActionHandler';
import {promisify} from 'util';
import {readFile, unlinkSync} from 'fs';
import * as assert from 'assert';
import {ActionSnapshot} from '../../../../src/models';
import {FlowService} from '../../../../src/services';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

@suite()
export class WriteToFileTestSuite {

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new WriteToFileActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(123, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('test', context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                path: 'test'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                content: 'test'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                path: '',
                content: 'test'
            }, context, snapshot)
        ).to.be.rejected;
    }


    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new WriteToFileActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate({
                path: '/tmp',
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                path: '/tmp',
                assignPathTo: {
                    ctx: 'test',
                    secrets: 'test'
                },
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                assignPathTo: {
                    ctx: 'test',
                    secrets: 'test'
                },
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                assignPathTo: {
                    secrets: 'test'
                },
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                assignPathTo: {
                    ctx: 'test'
                },
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async saveToFile(): Promise<void> {
        const actionHandler = new WriteToFileActionHandler();

        const tmpFile = await tmp.file();

        const context = FlowService.generateEmptyContext();

        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const content = 'test';
        await chai.expect(
            actionHandler.execute({
                path: tmpFile.path,
                assignPathTo: {
                    ctx: 'ct',
                    secrets: 'st'
                },
                content: content
            }, context, snapshot)
        ).to.be.not.rejected;

        const result = await promisify(readFile)(tmpFile.path, 'utf8');
        assert.strictEqual(result, content);
        assert.strictEqual(context.ctx.ct, tmpFile.path);
        assert.strictEqual(context.secrets.st, tmpFile.path);
    }

    @test()
    async saveToTempFile(): Promise<void> {
        const actionHandler = new WriteToFileActionHandler();
        const context = FlowService.generateEmptyContext();

        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const content = 'test';
        await chai.expect(
            actionHandler.execute({
                assignPathTo: {
                    ctx: 'ct',
                    secrets: 'st'
                },
                content: content
            }, context, snapshot)
        ).to.be.not.rejected;

        const result = await promisify(readFile)(context.ctx.ct, 'utf8');
        assert.strictEqual(result, content);
        assert.strictEqual(context.ctx.ct, context.secrets.st);

        // cleanup
        unlinkSync(context.ctx.ct);
    }
}
