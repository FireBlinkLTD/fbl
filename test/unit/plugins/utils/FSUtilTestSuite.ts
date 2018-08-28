import {suite, test} from 'mocha-typescript';
import * as assert from 'assert';
import {homedir} from 'os';
import {FSUtil} from '../../../../src/utils/FSUtil';
import {join} from 'path';
import {writeFile} from 'fs';
import {promisify} from 'util';

const tmp = require('tmp-promise');

@suite()
class FSUtilTestSuite {
    @test()
    async getAbsolutePath(): Promise<void> {
        assert.strictEqual(FSUtil.getAbsolutePath('~/test.tst', '/tmp'), homedir() + '/test.tst');
        assert.strictEqual(FSUtil.getAbsolutePath('/tmp/test.tst', '/var'), '/tmp/test.tst');
        assert.strictEqual(FSUtil.getAbsolutePath('./test.tst', '/var'), '/var/test.tst');
    }

    @test()
    async findFilesByMask(): Promise<void> {
        const tmpDir = await tmp.dir();
        const writeFileAsync = promisify(writeFile);

        const files = [
            join(tmpDir.path, 'a.txt'),
            join(tmpDir.path, 'b.txt'),
            join(tmpDir.path, 'c.ign'),
        ];

        for (const file of files) {
            await writeFileAsync(file, '', 'utf8');
        }

        let found = await FSUtil.findFilesByMasks(['*.txt', '*.ign'], null, tmpDir.path);
        assert.deepStrictEqual(found, files);

        found = await FSUtil.findFilesByMasks(['*.txt'], ['*.ign'], tmpDir.path);
        assert.deepStrictEqual(found, [
            files[0], files[1]
        ]);
    }
}
