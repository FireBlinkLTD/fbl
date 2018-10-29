import {suite, test} from 'mocha-typescript';
import {WriteToFileActionHandler} from '../../../../src/plugins/fs/WriteToFileActionHandler';
import {promisify} from 'util';
import {mkdir, readFile, unlinkSync, writeFile, writeFileSync} from 'fs';
import * as assert from 'assert';
import {ActionSnapshot} from '../../../../src/models';
import {resolve} from 'path';
import {ContextUtil} from '../../../../src/utils';
import {TempPathsRegistry} from '../../../../src/services';
import {Container} from 'typedi';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
export class WriteToFileTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new WriteToFileActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(123, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('test', context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                path: 'test'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                content: 'test'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                path: '',
                content: 'test'
            }, context, snapshot)
        ).to.be.rejected;
    }


    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new WriteToFileActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate({
                path: '/tmp',
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                path: '/tmp',
                assignPathTo: {
                    ctx: '$.test',
                    secrets: '$.test'
                },
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                assignPathTo: {
                    ctx: '$.test',
                    secrets: '$.test'
                },
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                assignPathTo: {
                    secrets: '$.test'
                },
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                assignPathTo: {
                    ctx: '$.test'
                },
                content: 'test'
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async saveToFile(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new WriteToFileActionHandler();

        const tmpFile = await tempPathsRegistry.createTempFile();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const content = 'test';
        await chai.expect(
            actionHandler.execute({
                path: tmpFile,
                assignPathTo: {
                    ctx: '$.ct',
                    secrets: '$.st'
                },
                content: content
            }, context, snapshot)
        ).to.be.not.rejected;

        const result = await promisify(readFile)(tmpFile, 'utf8');
        assert.strictEqual(result, content);
        assert.strictEqual(context.ctx.ct, tmpFile);
        assert.strictEqual(context.secrets.st, tmpFile);
    }

    @test()
    async saveToFileBasedOnTemplate(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new WriteToFileActionHandler();

        const templateFile = await tempPathsRegistry.createTempFile();
        const destinationFile = await tempPathsRegistry.createTempFile();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const content = '<$- ctx.global $>-<%- ctx.local %>';
        await promisify(writeFile)(templateFile, content, 'utf8');

        context.ctx.global = 'g';
        context.ctx.local = 'l';

        await actionHandler.execute({
            path: destinationFile,
            contentFromFile: templateFile,
        }, context, snapshot);

        const result = await promisify(readFile)(destinationFile, 'utf8');
        assert.strictEqual(result, 'g-l');
    }

    @test()
    async saveToTempFile(): Promise<void> {
        const actionHandler = new WriteToFileActionHandler();
        const context = ContextUtil.generateEmptyContext();

        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const content = 'test';
        await chai.expect(
            actionHandler.execute({
                assignPathTo: {
                    ctx: '$.ct',
                    secrets: '$.st'
                },
                content: content
            }, context, snapshot)
        ).to.be.not.rejected;

        const result = await promisify(readFile)(context.ctx.ct, 'utf8');
        assert.strictEqual(result, content);
        assert.strictEqual(context.ctx.ct, context.secrets.st);

        // cleanup
        unlinkSync(context.ctx.ct);
    }

    @test()
    async mkdirp(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new WriteToFileActionHandler();
        const context = ContextUtil.generateEmptyContext();

        const tmpdir = await tempPathsRegistry.createTempDir();
        const path = resolve(tmpdir, 'l1', 'l2', 'l3', 'test.txt');

        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const content = 'test';
        await actionHandler.execute({
            path: path,
            content: content
        }, context, snapshot);

        const result = await promisify(readFile)(path, 'utf8');
        assert.strictEqual(result, content);
    }

    @test()
    async fileInsteadOfFolderInParentPath(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new WriteToFileActionHandler();
        const context = ContextUtil.generateEmptyContext();

        const tmpdir = await tempPathsRegistry.createTempDir();
        let path = resolve(tmpdir, 'l1', 'test.txt');

        // write file on the folder level
        writeFileSync(resolve(tmpdir, 'l1'), '', 'utf8');

        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const content = 'test';
        await chai.expect(
            actionHandler.execute({
                path: path,
                content: content
            }, context, snapshot)
        ).to.be.rejected;

        path = resolve(tmpdir, 't1', 't2', 'test.txt');
        // write file on the folder level
        await promisify(mkdir)(resolve(tmpdir, 't1'));
        writeFileSync(resolve(tmpdir, 't1', 't2'), '', 'utf8');

        await chai.expect(
            actionHandler.execute({
                path: path,
                content: content
            }, context, snapshot)
        ).to.be.rejected;
    }
}
