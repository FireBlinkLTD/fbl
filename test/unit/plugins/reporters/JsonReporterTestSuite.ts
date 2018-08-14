import {suite, test} from 'mocha-typescript';
import {JsonReporter} from '../../../../src/plugins/reporters/JsonReporter';
import {ActionSnapshot} from '../../../../src/models';
import {promisify} from 'util';
import {readFile} from 'fs';
import * as assert from 'assert';

const tmp = require('tmp-promise');

@suite()
class JsonReporterTestSuite {
    @test()
    async generate(): Promise<void> {
        const reporter = new JsonReporter();
        const file = await tmp.file();

        await reporter.generate(file.path, new ActionSnapshot('test', '.', 0));
        const strReport = await promisify(readFile)(file.path, 'utf8');

        const report = JSON.parse(strReport);

        // check if created time is valid and was reported less than a second ago
        assert(new Date(report.createdAt).getTime() + 1000 > Date.now());

        assert.deepStrictEqual(report, {
            idOrAlias: 'test',
            wd: '.',
            idx: 0,
            duration: 0,
            steps: [],
            createdAt: report.createdAt, // time is a subject for change, so we can't hardcode it
            successful: false,
            childFailure: false
        });
    }
}
