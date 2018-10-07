import {suite, test} from 'mocha-typescript';
import {FSTemplateUtility} from '../../../../src/plugins/templateUtilities/FSTemplateUtility';
import * as assert from 'assert';
import {promisify} from 'util';
import {writeFile} from 'fs';

const tmp = require('tmp-promise');

@suite()
class FSTemplateUtilityTestSuite {
    @test()
    async getAbsolutePath(): Promise<void> {
        const fs = new FSTemplateUtility().getUtilities('/tmp').fs;

        assert(fs);
        assert(fs.getAbsolutePath);

        let path = fs.getAbsolutePath('./test');
        assert.strictEqual(path, '/tmp/test');

        path = fs.getAbsolutePath('./test', '/home/user');
        assert.strictEqual(path, '/home/user/test');
    }

    @test()
    async readText(): Promise<void> {
        const file = await tmp.file();
        await promisify(writeFile)(file.path, 'test', 'utf8');

        const readText = new FSTemplateUtility().getUtilities('/tmp').fs.read.text;
        const txt = readText(file.path);

        assert.strictEqual(txt, 'test');
    }

    @test()
    async readBase64(): Promise<void> {
        const file = await tmp.file();
        await promisify(writeFile)(file.path, 'test', 'utf8');

        const readBase64 = new FSTemplateUtility().getUtilities('/tmp').fs.read.base64;
        const base64 = readBase64(file.path);

        assert.strictEqual(base64, 'dGVzdA==');
    }
}
