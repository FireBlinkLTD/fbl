import {suite, test} from 'mocha-typescript';
import {ActionSnapshot} from '../../../../src/models';
import {MakeDirActionHandler} from '../../../../src/plugins/fs/MakeDirActionHandler';
import {resolve} from 'path';
import {existsSync, statSync} from 'fs';
import * as assert from 'assert';
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
        const actionHandler = new MakeDirActionHandler();
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
        const actionHandler = new MakeDirActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate('/tmp/test', context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async mkdir(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new MakeDirActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const tmpdir = await tempPathsRegistry.createTempDir();
        const path = resolve(tmpdir, 'l1');

        await actionHandler.execute(path, context, snapshot);

        assert(existsSync(path));
        assert(statSync(path).isDirectory());
    }
}
