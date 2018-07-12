import {test, suite} from 'mocha-typescript';
import {ContextValuesAssignment} from '../../../../src/plugins/context/ContextValuesAssignment';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {dump} from 'js-yaml';
import * as assert from 'assert';
const tmp = require('tmp-promise');

@suite()
export class ContextValuesAssignmentTestSuite {

    @test()
    async assignValues(): Promise<void> {
        const actionHandler = new ContextValuesAssignment();

        const context: any = {
            existing: {
                value: 'value'
            }
        };

        const fileContent = {
            file_content: 'ftpo'
        };

        const tmpFile = await tmp.file();
        console.log(tmpFile);

        // write to temp file
        await promisify(writeFile)(tmpFile.file, dump(fileContent), 'utf8');

        await actionHandler.execute({
            test: {
                inline: 123
            },
            existing: {
                inline: {
                    other: 'other'
                }
            },
            fromFile: {
                file: tmpFile.file
            }
        }, context);

        assert.strictEqual(context.test, 123);
        assert.strictEqual(context.existing.value, undefined);
        assert.strictEqual(context.existing.other, 'other');
        assert.strictEqual(context.fromFile.file_content, fileContent.file_content);
    }
}
