import {suite, test} from 'mocha-typescript';
import {promisify} from 'util';
import {readFile} from 'fs';
import * as assert from 'assert';
import {WriteToTempFile} from '../../../../src/plugins/files/WriteToTempFile';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

@suite()
export class WriteToTempFileTestSuite {

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new WriteToTempFile();

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
                context: 'test'
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                context: 'test'
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                context: '',
                content: 'test'
            }, {})
        ).to.be.rejected;
    }


    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new WriteToTempFile();

        await chai.expect(
            actionHandler.validate({
                context: '/tmp',
                content: 'test'
            }, {})
        ).to.be.not.rejected;
    }

    @test()
    async saveToFile(): Promise<void> {
        const actionHandler = new WriteToTempFile();

        const context: any = {
            ctx: {}
        };

        const content = 'test';
        await chai.expect(
            actionHandler.execute({
                context: 'tst',
                content: content
            }, context)
        ).to.be.not.rejected;

        const result = await promisify(readFile)(context.ctx.tst, 'utf8');
        assert.strictEqual(result, content);
    }
}
