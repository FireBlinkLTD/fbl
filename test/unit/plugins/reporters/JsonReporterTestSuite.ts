import {suite, test} from 'mocha-typescript';
import {JsonReporter} from '../../../../src/plugins/reporters/JsonReporter';
import {ActionSnapshot} from '../../../../src/models';
import {promisify} from 'util';
import {readFile} from 'fs';
import * as assert from 'assert';
import {TempPathsRegistry} from '../../../../src/services';
import {Container} from 'typedi';

@suite()
class JsonReporterTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async generate(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const reporter = new JsonReporter();
        const file = await tempPathsRegistry.createTempFile();

        await reporter.generate(file, {}, new ActionSnapshot('test', {}, '.', 0));
        const strReport = await promisify(readFile)(file, 'utf8');

        const report = JSON.parse(strReport);

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
