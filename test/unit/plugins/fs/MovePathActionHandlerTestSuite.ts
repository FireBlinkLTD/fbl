import {suite, test} from 'mocha-typescript';
import {ActionSnapshot} from '../../../../src/models';
import {sep, resolve} from 'path';
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
            actionHandler.validate(1234, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                from: 'test'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                to: 'test'
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new MovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate({
                from: '/tmp/',
                to: '/tmp/'
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async move(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new MovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const tmpdir = await tempPathsRegistry.createTempDir();
        await FSUtil.mkdirp(resolve(tmpdir, 'l1', 'l2'));

        let tmpfile = resolve(tmpdir, 'l1', 'l2', '1.txt');
        await promisify(writeFile)(tmpfile, '', 'utf8');
        tmpfile = resolve(tmpdir, 'l1', 'l2', '2.txt');
        await promisify(writeFile)(tmpfile, '', 'utf8');

        // move file to folder without specifying a new name
        let source = tmpfile;
        let target = tmpdir + sep + 'l1' + sep;

        await actionHandler.execute({
            from: source,
            to: target
        }, context, snapshot);

        assert(existsSync(target + '2.txt'));

        // move file to folder with file name overriding
        source = resolve(tmpdir, 'l1', 'l2', '1.txt');
        target = resolve(tmpdir, 'l1', 'l2', 'm1.txt');

        await actionHandler.execute({
            from: source,
            to: target
        }, context, snapshot);

        assert(existsSync(target));

        // move folder with name overriding
        source = resolve(tmpdir, 'l1');
        target = resolve(tmpdir, 'test2');

        await actionHandler.execute({
            from: source,
            to: target
        }, context, snapshot);

        assert(existsSync(resolve(tmpdir, 'test2', '2.txt')));
        assert(existsSync(resolve(tmpdir, 'test2', 'l2', 'm1.txt')));

        // move folder contents into different folder;
        source = target + sep;
        target = resolve(tmpdir, 'test3');

        await actionHandler.execute({
            from: source,
            to: target
        }, context, snapshot);

        assert(existsSync(resolve(tmpdir, 'test3', '2.txt')));
        assert(existsSync(resolve(tmpdir, 'test3', 'l2', 'm1.txt')));
    }

    @test()
    async moveMissingPath(): Promise<void> {
        const actionHandler = new MovePathActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.execute({
                from: resolve(homedir(), 'MISSING_FBL_PATH', '1', '2', '3'),
                to: resolve(homedir(), 'MISSING_FBL_PATH', '3', '2', '1'),
            }, context, snapshot)
        ).to.be.rejected;
    }
}
