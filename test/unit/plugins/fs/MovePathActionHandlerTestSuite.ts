import {suite, test} from 'mocha-typescript';
import {ActionSnapshot} from '../../../../src/models';
import {join} from 'path';
import {existsSync, writeFile} from 'fs';
import * as assert from 'assert';
import {MovePathActionHandler} from '../../../../src/plugins/fs/MovePathActionHandler';
import {promisify} from 'util';
import {FSUtil, ContextUtil} from '../../../../src/utils';
import {homedir} from 'os';
import {TempPathsRegistry} from '../../../../src/services';
import {Container} from 'typedi';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite
class MovePathActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new MovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(true, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(1234, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                from: 'test'
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                to: 'test'
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new MovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate({
                from: '/tmp/',
                to: '/tmp/'
            }, context, snapshot, {})
        ).to.be.not.rejected;
    }

    private static async prepareTmpDir(dirs: string[], files: string[]): Promise<string> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const tmpdir = await tempPathsRegistry.createTempDir();
        for (const dir of dirs) {
            await FSUtil.mkdirp(join(tmpdir, dir));
        }

        for (const file of files) {
            const tmpfile = join(tmpdir, file);
            await promisify(writeFile)(tmpfile, '', 'utf8');
        }

        return tmpdir;
    }

    @test()
    async moveFileToFolder(): Promise<void> {
        const tmpdir = await MovePathActionHandlerTestSuite.prepareTmpDir(
            [
                'l1/l2'
            ],
            [
                'l1/l2/1.txt'
            ]
        );

        const actionHandler = new MovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, tmpdir, 0, {});

        await actionHandler.execute({
            from: 'l1/l2/1.txt',
            to: 'l1/'
        }, context, snapshot, {});

        assert(existsSync(join(tmpdir, 'l1/1.txt')));
    }

    @test()
    async moveFileToFolderWithDifferentName() {
        const tmpdir = await MovePathActionHandlerTestSuite.prepareTmpDir(
            [
                'l1/l2'
            ],
            [
                'l1/l2/1.txt'
            ]
        );

        const actionHandler = new MovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, tmpdir, 0, {});

        await actionHandler.execute({
            from: 'l1/l2/1.txt',
            to: 'l1/m1.txt'
        }, context, snapshot, {});

        assert(existsSync(join(tmpdir, 'l1/m1.txt')));
    }

    @test()
    async moveFolderWithDifferentName(): Promise<void> {
        const tmpdir = await MovePathActionHandlerTestSuite.prepareTmpDir(
            [
                'l1/l2'
            ],
            [
                'l1/l2/1.txt'
            ]
        );

        const actionHandler = new MovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, tmpdir, 0, {});

        await actionHandler.execute({
            from: 'l1',
            to: 't1'
        }, context, snapshot, {});

        assert(existsSync(join(tmpdir, 't1/l2/1.txt')));
    }

    @test()
    async moveFolderContents(): Promise<void> {
        const tmpdir = await MovePathActionHandlerTestSuite.prepareTmpDir(
            [
                'l1/l2'
            ],
            [
                'l1/l2/1.txt'
            ]
        );

        const actionHandler = new MovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, tmpdir, 0, {});

        await actionHandler.execute({
            from: 'l1/',
            to: 't1'
        }, context, snapshot, {});

        assert(existsSync(join(tmpdir, 't1/l2/1.txt')));
    }

    @test()
    async moveMissingPath(): Promise<void> {
        const actionHandler = new MovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.execute({
                from: join(homedir(), 'MISSING_FBL_PATH', '1', '2', '3'),
                to: join(homedir(), 'MISSING_FBL_PATH', '3', '2', '1'),
            }, context, snapshot, {})
        ).to.be.rejected;
    }
}
