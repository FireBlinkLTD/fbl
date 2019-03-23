import { suite, test } from 'mocha-typescript';
import { WriteToFileActionHandler } from '../../../../src/plugins/fs/WriteToFileActionHandler';
import { promisify } from 'util';
import { mkdir, readFile, unlinkSync, writeFile, writeFileSync } from 'fs';
import * as assert from 'assert';
import { ActionSnapshot } from '../../../../src/models';
import { resolve } from 'path';
import { ContextUtil } from '../../../../src/utils';
import { TempPathsRegistry } from '../../../../src/services';
import { Container } from 'typedi';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class WriteToFileTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new WriteToFileActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor('test', context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        path: 'test',
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        content: 'test',
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        path: '',
                        content: 'test',
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new WriteToFileActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    path: '/tmp',
                    content: 'test',
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    path: '/tmp',
                    assignPathTo: {
                        ctx: '$.test',
                        secrets: '$.test',
                    },
                    content: 'test',
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    assignPathTo: {
                        ctx: '$.test',
                        secrets: '$.test',
                    },
                    content: 'test',
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    assignPathTo: {
                        secrets: '$.test',
                    },
                    content: 'test',
                },
                context,
                snapshot,
                {},
            )
            .validate();

        await actionHandler
            .getProcessor(
                {
                    assignPathTo: {
                        ctx: '$.test',
                    },
                    content: 'test',
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async saveToFile(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const actionHandler = new WriteToFileActionHandler();

        const tmpFile = await tempPathsRegistry.createTempFile();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const content = 'test';
        const processor = await actionHandler.getProcessor(
            {
                path: tmpFile,
                assignPathTo: {
                    ctx: '$.ct',
                    secrets: '$.st',
                },
                content: content,
            },
            context,
            snapshot,
            {},
        );

        await processor.validate();
        await processor.execute();

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
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const content = '<$- ctx.global $>-<%- ctx.local %>';
        await promisify(writeFile)(templateFile, content, 'utf8');

        context.ctx.global = 'g';
        context.ctx.local = 'l';

        const processor = await actionHandler.getProcessor(
            {
                path: destinationFile,
                contentFromFile: templateFile,
            },
            context,
            snapshot,
            {},
        );

        await processor.validate();
        await processor.execute();

        const result = await promisify(readFile)(destinationFile, 'utf8');
        assert.strictEqual(result, 'g-l');
    }

    @test()
    async saveToTempFile(): Promise<void> {
        const actionHandler = new WriteToFileActionHandler();
        const context = ContextUtil.generateEmptyContext();

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const content = 'test';

        const processor = await actionHandler.getProcessor(
            {
                assignPathTo: {
                    ctx: '$.ct',
                    secrets: '$.st',
                },
                pushPathTo: {
                    ctx: '$.psh',
                },
                content: content,
            },
            context,
            snapshot,
            {},
        );

        await processor.validate();
        await processor.execute();

        const result = await promisify(readFile)(context.ctx.ct, 'utf8');
        assert.strictEqual(result, content);
        assert.strictEqual(context.ctx.ct, context.secrets.st);
        assert.deepStrictEqual(context.ctx.psh, [context.secrets.st]);

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

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const content = 'test';
        const processor = await actionHandler.getProcessor(
            {
                path: path,
                content: content,
            },
            context,
            snapshot,
            {},
        );

        await processor.validate();
        await processor.execute();

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

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const content = 'test';
        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        path: path,
                        content: content,
                    },
                    context,
                    snapshot,
                    {},
                )
                .execute(),
        ).to.be.rejected;

        path = resolve(tmpdir, 't1', 't2', 'test.txt');
        // write file on the folder level
        await promisify(mkdir)(resolve(tmpdir, 't1'));
        writeFileSync(resolve(tmpdir, 't1', 't2'), '', 'utf8');

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        path: path,
                        content: content,
                    },
                    context,
                    snapshot,
                    {},
                )
                .execute(),
        ).to.be.rejected;
    }
}
