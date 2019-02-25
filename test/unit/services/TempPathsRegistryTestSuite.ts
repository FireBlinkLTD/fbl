import { suite, test } from 'mocha-typescript';
import { TempPathsRegistry } from '../../../src/services';
import { exists, rmdir, unlink } from 'fs';
import { promisify } from 'util';
import * as assert from 'assert';

@suite()
class TempPathsRegistryTestSuite {
    @test()
    async testCleanup(): Promise<void> {
        const tempPathsRegistry = new TempPathsRegistry();
        const existsAsync = promisify(exists);
        const unlinkAsync = promisify(unlink);
        const rmdirAsync = promisify(rmdir);

        // create temp dirs and files with keep option turned on and off
        const keepFalseDir = await tempPathsRegistry.createTempDir(false);
        const keepTrueDir = await tempPathsRegistry.createTempDir(true);
        const keepFalseFile = await tempPathsRegistry.createTempFile(false);
        const keepTrueFile = await tempPathsRegistry.createTempFile(true);

        // check existence of temp paths
        let keepFalseDirExists = await existsAsync(keepFalseDir);
        let keepTrueDirExists = await existsAsync(keepTrueDir);
        let keepFalseFileExists = await existsAsync(keepFalseFile);
        let keepTrueFileExists = await existsAsync(keepTrueFile);

        assert(keepFalseDirExists);
        assert(keepTrueDirExists);
        assert(keepFalseFileExists);
        assert(keepTrueFileExists);

        // cleanup
        await tempPathsRegistry.cleanup();

        // check existence of temp paths after cleanup
        keepFalseDirExists = await existsAsync(keepFalseDir);
        keepTrueDirExists = await existsAsync(keepTrueDir);
        keepFalseFileExists = await existsAsync(keepFalseFile);
        keepTrueFileExists = await existsAsync(keepTrueFile);

        assert(!keepFalseDirExists);
        assert(keepTrueDirExists);
        assert(!keepFalseFileExists);
        assert(keepTrueFileExists);

        // remove dir and file that should be kept
        await rmdirAsync(keepTrueDir);
        await unlinkAsync(keepTrueFile);
    }
}
