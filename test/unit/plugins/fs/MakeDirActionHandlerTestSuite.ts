import {suite, test} from 'mocha-typescript';
import {FlowService} from '../../../../src/services';
import {ActionSnapshot} from '../../../../src/models';
import {MakeDirActionHandler} from '../../../../src/plugins/fs/MakeDirActionHandler';
import {resolve} from 'path';
import {existsSync, statSync} from 'fs';
import * as assert from 'assert';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

@suite
class MakeDirActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new MakeDirActionHandler();
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
        const actionHandler = new MakeDirActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate('/tmp/test', context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async mkdir(): Promise<void> {
        const actionHandler = new MakeDirActionHandler();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const tmpdir = await tmp.dir();
        const path = resolve(tmpdir.path, 'l1');

        await actionHandler.execute(path, context, snapshot);

        assert(existsSync(path));
        assert(statSync(path).isDirectory());
    }
}
