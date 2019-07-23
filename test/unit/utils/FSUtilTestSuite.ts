import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { homedir } from 'os';
import { FSUtil } from '../../../src/utils';
import { join } from 'path';
import { writeFile } from 'fs';
import { promisify } from 'util';
import { TempPathsRegistry } from '../../../src/services';
import { Container } from 'typedi';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class FSUtilTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async corruptedYamlRead(): Promise<void> {
        const tmpFile = await Container.get(TempPathsRegistry).createTempFile();
        await promisify(writeFile)(tmpFile, '12414: @>');

        await chai.expect(FSUtil.readYamlFromFile(tmpFile)).to.be.rejectedWith('Unable to parse YAML');
    }

    @test()
    async missingFileRead(): Promise<void> {
        const tmpDir = await Container.get(TempPathsRegistry).createTempDir();
        const path = join(tmpDir, 'test.txt');

        await chai
            .expect(FSUtil.readTextFile(path))
            .to.be.rejectedWith(`Unable to read file at path: ${path}. File is missing`);
    }

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
