import {test, suite} from 'mocha-typescript';
import {ContextValuesAssignment} from '../../../../src/plugins/context/ContextValuesAssignment';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {dump} from 'js-yaml';
import * as assert from 'assert';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

@suite()
export class ContextValuesAssignmentTestSuite {

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ContextValuesAssignment();

        await chai.expect(
            actionHandler.validate([], {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: {}
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: []
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 123
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: 'tst'
            }, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                test: {
                    inline: 'test',
                    file: '/tmp/test'
                }
            }, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ContextValuesAssignment();

        await chai.expect(
            actionHandler.validate({
                test: {
                    inline: 'test'
                }
            }, {})
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                test: {
                    file: '/tmp/test'
                }
            }, {})
        ).to.be.not.rejected;
    }

    @test()
    async assignValues(): Promise<void> {
        const actionHandler = new ContextValuesAssignment();

        const context: any = {
            ctx: {
                existing: {
                    value: 'value'
                }
            }
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

        await actionHandler.validate(options, context);
        await actionHandler.execute(options, context);

        assert.strictEqual(context.ctx.test, 123);
        assert.strictEqual(context.ctx.existing.value, undefined);
        assert.strictEqual(context.ctx.existing.other, 'other');
        assert.strictEqual(context.ctx.fromFile.file_content, fileContent.file_content);
    }
}
