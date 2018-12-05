import {suite, test} from 'mocha-typescript';
import {FSTemplateUtility} from '../../../../src/plugins/templateUtilities/FSTemplateUtility';
import * as assert from 'assert';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {TempPathsRegistry} from '../../../../src/services';
import {Container} from 'typedi';
import { ContextUtil, ActionSnapshot } from '../../../../src';

@suite()
class FSTemplateUtilityTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async getAbsolutePath(): Promise<void> {
        const fs = new FSTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('', {}, '/tmp', 0, {}),
            {}
        ).fs;

        assert(fs);
        assert(fs.getAbsolutePath);

        let path = fs.getAbsolutePath('./test');
        assert.strictEqual(path, '/tmp/test');

        path = fs.getAbsolutePath('./test', '/home/user');
        assert.strictEqual(path, '/home/user/test');
    }

    @test()
    async readText(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const file = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(file, 'test', 'utf8');

        const readText = new FSTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('', {}, '/tmp', 0, {}),
            {}
        ).fs.read.text;
        const txt = readText(file);

        assert.strictEqual(txt, 'test');
    }

    @test()
    async readBase64(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const file = await tempPathsRegistry.createTempFile();
        await promisify(writeFile)(file, 'test', 'utf8');

        const readBase64 = new FSTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('', {}, '/tmp', 0, {}),
            {}
        ).fs.read.base64;
        const base64 = readBase64(file);

        assert.strictEqual(base64, 'dGVzdA==');
    }
}
