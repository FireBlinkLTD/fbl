import {suite, test} from 'mocha-typescript';
import {WriteToFile} from '../../../../src/plugins/files/WriteToFile';
import {promisify} from 'util';
import {readFile} from 'fs';
import * as assert from 'assert';
import {IContext} from '../../../../src/interfaces';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

@suite()
export class WriteToFileTestSuite {

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new WriteToFile();

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };

        await chai.expect(
            actionHandler.validate([], context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(123, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('test', context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                path: 'test'
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                content: 'test'
            }, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                path: '',
                content: 'test'
            }, context)
        ).to.be.rejected;
    }


    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new WriteToFile();

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };

        await chai.expect(
            actionHandler.validate({
                path: '/tmp',
                content: 'test'
            }, context)
        ).to.be.not.rejected;
    }

    @test()
    async saveToFile(): Promise<void> {
        const actionHandler = new WriteToFile();

        const tmpFile = await tmp.file();

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };

        const content = 'test';
        await chai.expect(
            actionHandler.execute({
                path: tmpFile.path,
                content: content
            }, context)
        ).to.be.not.rejected;

        const result = await promisify(readFile)(tmpFile.path, 'utf8');
        assert.strictEqual(result, content);
    }
}
