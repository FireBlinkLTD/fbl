import { suite, test } from 'mocha-typescript';
import { ActionSnapshot } from '../../../../src/models';
import { join } from 'path';
import { exists, mkdir, writeFile } from 'fs';
import * as assert from 'assert';
import { RemovePathActionHandler } from '../../../../src/plugins/fs/RemovePathActionHandler';
import { promisify } from 'util';
import { ContextUtil } from '../../../../src/utils';
import { TempPathsRegistry } from '../../../../src/services';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite
class MakeDirActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new RemovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(true, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(1234.124124, context, snapshot, {}).validate()).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new RemovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor('/tmp/test', context, snapshot, {}).validate()).to.be.not.rejected;
    }

    @test()
    async removePath(): Promise<void> {
        const tempPathsRegistry = TempPathsRegistry.instance;

        const actionHandler = new RemovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const tmpdir = await tempPathsRegistry.createTempDir();

        const path_l1 = join(tmpdir, 'l1');
        const path_l2 = join(tmpdir, 'l1', 'l2');

        await promisify(mkdir)(path_l1);
        await promisify(mkdir)(path_l2);

        await promisify(writeFile)(join(tmpdir, 'test1.txt'), '', 'utf8');
        await promisify(writeFile)(join(path_l1, 'test2.txt'), '', 'utf8');
        await promisify(writeFile)(join(path_l2, 'test3.txt'), '', 'utf8');

        const processor = await actionHandler.getProcessor(tmpdir, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        const exist = await promisify(exists)(tmpdir);
        assert(!exist);
    }

    @test()
    async removeNonExistingPath(): Promise<void> {
        const tempPathsRegistry = TempPathsRegistry.instance;

        const actionHandler = new RemovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const tmpdir = await tempPathsRegistry.createTempDir();

        const path_l1 = join(tmpdir, 'l1');

        await chai.expect(actionHandler.getProcessor(path_l1, context, snapshot, {}).execute()).to.be.rejected;
    }
}
