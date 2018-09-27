import {suite, test} from 'mocha-typescript';
import {FlowService} from '../../../../src/services';
import {ActionSnapshot} from '../../../../src/models';
import {resolve} from 'path';
import {exists, existsSync, mkdir, statSync, writeFile} from 'fs';
import * as assert from 'assert';
import {RemovePathActionHandler} from '../../../../src/plugins/fs/RemovePathActionHandler';
import {promisify} from 'util';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

@suite
class MakeDirActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new RemovePathActionHandler();
        const context = FlowService.generateEmptyContext();
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
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate('/tmp/test', context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async removePath(): Promise<void> {
        const actionHandler = new RemovePathActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const tmpdir = await tmp.dir();

        const path_l1 = resolve(tmpdir.path, 'l1');
        const path_l2 = resolve(tmpdir.path, 'l1', 'l2');

        await promisify(mkdir)(path_l1);
        await promisify(mkdir)(path_l2);

        await promisify(writeFile)(resolve(tmpdir.path, 'test.txt'), '', 'utf8');
        await promisify(writeFile)(resolve(path_l1, 'test.txt'), '', 'utf8');
        await promisify(writeFile)(resolve(path_l2, 'test.txt'), '', 'utf8');

        await actionHandler.execute(tmpdir.path, context, snapshot);

        const exist = await promisify(exists)(tmpdir.path);
        assert(!exist);
    }

    @test()
    async removeNonExistingPath(): Promise<void> {
        const actionHandler = new RemovePathActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const tmpdir = await tmp.dir();

        const path_l1 = resolve(tmpdir.path, 'l1');

        await chai.expect(
            actionHandler.execute(path_l1, context, snapshot)
        ).to.be.not.rejected;
    }
}
