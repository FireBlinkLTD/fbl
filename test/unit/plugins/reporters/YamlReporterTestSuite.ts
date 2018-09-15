import {suite, test} from 'mocha-typescript';
import {YamlReporter} from '../../../../src/plugins/reporters/YamlReporter';
import {ActionSnapshot} from '../../../../src/models';
import {promisify} from 'util';
import {readFile} from 'fs';
import * as assert from 'assert';
import {safeLoad} from 'js-yaml';

const tmp = require('tmp-promise');

@suite()
class YamlReporterTestSuite {
    @test()
    async generate(): Promise<void> {
        const reporter = new YamlReporter();
        const file = await tmp.file();

        await reporter.generate(file.path, {}, new ActionSnapshot('test', {}, '.', 0));
        const strReport = await promisify(readFile)(file.path, 'utf8');

        const report = safeLoad(strReport);

        // check if created time is valid and was reported less than a second ago
        assert(new Date(report.createdAt).getTime() + 1000 > Date.now());

        assert.deepStrictEqual(report, {
            idOrAlias: 'test',
            metadata: {},
            wd: '.',
            idx: 0,
            ignoreChildFailure: false,
            duration: 0,
            steps: [],
            createdAt: report.createdAt, // time is a subject for change, so we can't hardcode it
            successful: false,
            childFailure: false
        });
    }
}
