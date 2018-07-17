import {suite, test} from 'mocha-typescript';
import {WriteToFile} from '../../../../src/plugins/files/WriteToFile';
import {promisify} from 'util';
import {readFile} from 'fs';
import * as assert from 'assert';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

@suite()
export class WriteToFileTestSuite {

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new WriteToFile();

        await chai.expect(
            actionHandler.validate([], {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(123, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('test', {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                path: 'test'
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                content: 'test'
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                path: '',
                content: 'test'
            }, {})
        ).to.be.rejected;
    }


    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new WriteToFile();

        await chai.expect(
            actionHandler.validate({
                path: '/tmp',
                content: 'test'
            }, {})
        ).to.be.not.rejected;
    }

    @test()
    async saveToFile(): Promise<void> {
        const actionHandler = new WriteToFile();

        const tmpFile = await tmp.file();

        const content = 'test';
        await chai.expect(
            actionHandler.execute({
                path: tmpFile.path,
                content: content
            }, {})
        ).to.be.not.rejected;

        const result = await promisify(readFile)(tmpFile.path, 'utf8');
        assert.strictEqual(result, content);
    }
}
