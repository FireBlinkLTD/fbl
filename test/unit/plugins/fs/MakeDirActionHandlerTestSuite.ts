import { suite, test } from 'mocha-typescript';
import { ActionSnapshot } from '../../../../src/models';
import { MakeDirActionHandler } from '../../../../src/plugins/fs/MakeDirActionHandler';
import { resolve } from 'path';
import { existsSync, statSync } from 'fs';
import * as assert from 'assert';
import { ContextUtil } from '../../../../src/utils';
import { TempPathsRegistry } from '../../../../src/services';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite
class MakeDirActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new MakeDirActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(true, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(1234.124124, context, snapshot, {}).validate()).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new MakeDirActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        await actionHandler.getProcessor('/tmp/test', context, snapshot, {}).validate();
    }

    @test()
    async mkdir(): Promise<void> {
        const tempPathsRegistry = TempPathsRegistry.instance;

        const actionHandler = new MakeDirActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const tmpdir = await tempPathsRegistry.createTempDir();
        const path = resolve(tmpdir, 'l1');

        const processor = actionHandler.getProcessor(path, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert(existsSync(path));
        assert(statSync(path).isDirectory());
    }
}
