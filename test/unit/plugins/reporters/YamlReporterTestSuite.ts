import { suite, test } from 'mocha-typescript';
import { YamlReporter } from '../../../../src/plugins/reporters/YamlReporter';
import { ActionSnapshot } from '../../../../src/models';
import { promisify } from 'util';
import { readFile } from 'fs';
import * as assert from 'assert';
import { safeLoad } from 'js-yaml';
import { TempPathsRegistry } from '../../../../src/services';
import { Container } from 'typedi';
import { IReport } from '../../../../src/interfaces';
import { ContextUtil } from '../../../../src/utils';

@suite()
class YamlReporterTestSuite {
    @test()
    async generate(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const reporter = new YamlReporter();
        const file = await tempPathsRegistry.createTempFile();

        const context = ContextUtil.generateEmptyContext();

        const parameters = {
            parameters: {
                test: true,
            },
            iteration: {
                index: 1,
            },
        };

        const reportSrc = <IReport>{
            context: {
                initial: ContextUtil.toBase(context),
                final: ContextUtil.toBase(context),
            },
            snapshot: new ActionSnapshot('index.yml', 'test', {}, '.', 0, parameters),
        };

        await reporter.generate(file, {}, reportSrc);
        const strReport = await promisify(readFile)(file, 'utf8');

        const report = safeLoad(strReport);

        // check if created time is valid and was reported less than a second ago
        assert(new Date(report.snapshot.createdAt).getTime() + 1000 > Date.now());

        assert.deepStrictEqual(report, {
            context: {
                initial: {
                    ctx: context.ctx,
                    summary: context.summary,
                },
                final: {
                    ctx: context.ctx,
                    summary: context.summary,
                },
            },
            snapshot: {
                source: 'index.yml',
                idOrAlias: 'test',
                metadata: {},
                parameters: parameters,
                wd: '.',
                idx: 0,
                ignoreChildFailure: false,
                duration: 0,
                steps: [],
                createdAt: report.snapshot.createdAt, // time is a subject for change, so we can't hardcode it
                successful: false,
                childFailure: false,
            },
        });
    }
}
