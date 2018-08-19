import {suite, test} from 'mocha-typescript';
import {WriteToFile} from '../../../../src/plugins/fs/WriteToFile';
import {promisify} from 'util';
import {readFile} from 'fs';
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
        const actionHandler = new WriteToFile();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

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
        const actionHandler = new WriteToFile();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '', 0);

        await chai.expect(
            actionHandler.validate({
                path: '/tmp',
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async saveToFile(): Promise<void> {
        const actionHandler = new WriteToFile();

        const tmpFile = await tmp.file();

        const context = FlowService.generateEmptyContext();

        const snapshot = new ActionSnapshot('.', '', 0);

        const content = 'test';
        await chai.expect(
            actionHandler.execute({
                path: tmpFile.path,
                content: content
            }, context, snapshot)
        ).to.be.not.rejected;

        const result = await promisify(readFile)(tmpFile.path, 'utf8');
        assert.strictEqual(result, content);
    }
}
