import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { homedir } from 'os';
import { FSUtil } from '../../../src/utils';
import { join } from 'path';
import { writeFile } from 'fs';
import { promisify } from 'util';
import { TempPathsRegistry } from '../../../src/services';
import { Container } from 'typedi';

@suite()
class FSUtilTestSuite {
    @test()
    async getAbsolutePath(): Promise<void> {
        assert.strictEqual(FSUtil.getAbsolutePath('~/test.tst', '/tmp'), homedir() + '/test.tst');
        assert.strictEqual(FSUtil.getAbsolutePath('/tmp/test.tst', '/var'), '/tmp/test.tst');
        assert.strictEqual(FSUtil.getAbsolutePath('/tmp/test.tst/', '/var'), '/tmp/test.tst');
        assert.strictEqual(FSUtil.getAbsolutePath('./test.tst', '/var'), '/var/test.tst');
    }

    @test()
    async findFilesByMask(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const tmpDir = await tempPathsRegistry.createTempDir();
        const writeFileAsync = promisify(writeFile);

        const files = [join(tmpDir, 'a.txt'), join(tmpDir, 'b.txt'), join(tmpDir, 'c.ign')];

        for (const file of files) {
            await writeFileAsync(file, '', 'utf8');
        }

        let found = await FSUtil.findFilesByMasks(['*.txt', '*.ign'], null, tmpDir);
        assert.deepStrictEqual(found, files);

        found = await FSUtil.findFilesByMasks(['*.txt'], ['*.ign'], tmpDir);
        assert.deepStrictEqual(found, [files[0], files[1]]);
    }
}
