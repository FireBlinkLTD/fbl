import {suite, test} from 'mocha-typescript';
import {ActionSnapshot} from '../../../../src/models';
import {EncryptActionHandler} from '../../../../src/plugins/fs/EncryptActionHandler';
import {promisify} from 'util';
import {mkdir, readFile, writeFile} from 'fs';
import {join} from 'path';
import {DecryptActionHandler} from '../../../../src/plugins/fs/DecryptActionHandler';
import * as assert from 'assert';
import {ContextUtil} from '../../../../src/utils';
import {TempPathsRegistry} from '../../../../src/services';
import {Container} from 'typedi';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class CryptoTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new EncryptActionHandler();
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
                password: false,
                include: ['/tmp']
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                password: 'secret',
                include: []
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                password: 'secret',
                include: ['/tmp'],
                exclude: []
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new EncryptActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await actionHandler.validate({
            password: 'secret',
            include: ['/tmp'],
            exclude: ['/tmp/.gitignore']
        }, context, snapshot);

        await actionHandler.validate({
            password: 'secret',
            include: ['/tmp']
        }, context, snapshot);
    }

    @test()
    async decryptFiles(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const encryptActionHandler = new EncryptActionHandler();
        const decryptActionHandler = new DecryptActionHandler();

        const tmpDir = await tempPathsRegistry.createTempDir();
        const writeFileAsync = promisify(writeFile);
        const readFileAsync = promisify(readFile);
        const mkdirAsync = promisify(mkdir);

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, tmpDir, 0);

        const path_l1 = join(tmpDir, 'l1');
        const path_l2 = join(tmpDir, 'l1', 'l2');

        await mkdirAsync(path_l1);
        await mkdirAsync(path_l2);

        const files = [
            join(tmpDir, 'a.txt'),
            join(path_l1, 'b.ign'),
            join(path_l2, 'c.txt'),
        ];

        const fileContent = 'test@'.repeat(100);

        for (const file of files) {
            await writeFileAsync(file, fileContent, 'utf8');
        }

        const password = 'super_secret_password';

        await encryptActionHandler.execute({
            password: password,
            include: ['**/*.txt'],
            exclude: ['**/*.ign']
        }, context, snapshot);

        for (const file of files) {
            const content = await readFileAsync(file, 'utf8');

            if (file.endsWith('.txt')) {
                assert.notStrictEqual(content, fileContent);
            } else {
                assert.strictEqual(content, fileContent);
            }
        }

        await decryptActionHandler.execute({
            password: password,
            include: ['**/*.txt'],
            exclude: ['**/*.ign']
        }, context, snapshot);

        for (const file of files) {
            const content = await readFileAsync(file, 'utf8');
            assert.strictEqual(content, fileContent);
        }
    }
}
