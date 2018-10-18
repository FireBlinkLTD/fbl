import {suite, test} from 'mocha-typescript';
import {ActionSnapshot} from '../../../../src/models';
import {resolve} from 'path';
import {exists, mkdir, writeFile} from 'fs';
import * as assert from 'assert';
import {RemovePathActionHandler} from '../../../../src/plugins/fs/RemovePathActionHandler';
import {promisify} from 'util';
import {ContextUtil} from '../../../../src/utils';
import {TempPathsRegistry} from '../../../../src/services';
import {Container} from 'typedi';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite
class MakeDirActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new RemovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(true, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(1234.124124, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new RemovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate('/tmp/test', context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async removePath(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new RemovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const tmpdir = await tempPathsRegistry.createTempDir();

        const path_l1 = resolve(tmpdir, 'l1');
        const path_l2 = resolve(tmpdir, 'l1', 'l2');

        await promisify(mkdir)(path_l1);
        await promisify(mkdir)(path_l2);

        await promisify(writeFile)(resolve(tmpdir, 'test.txt'), '', 'utf8');
        await promisify(writeFile)(resolve(path_l1, 'test.txt'), '', 'utf8');
        await promisify(writeFile)(resolve(path_l2, 'test.txt'), '', 'utf8');

        await actionHandler.execute(tmpdir, context, snapshot);

        const exist = await promisify(exists)(tmpdir);
        assert(!exist);
    }

    @test()
    async removeNonExistingPath(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new RemovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const tmpdir = await tempPathsRegistry.createTempDir();

        const path_l1 = resolve(tmpdir, 'l1');

        await chai.expect(
            actionHandler.execute(path_l1, context, snapshot)
        ).to.be.rejected;
    }
}
