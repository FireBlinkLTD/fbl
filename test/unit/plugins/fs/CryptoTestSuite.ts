import {suite, test} from 'mocha-typescript';
import {FlowService} from '../../../../src/services';
import {ActionSnapshot} from '../../../../src/models';
import {Encrypt} from '../../../../src/plugins/fs/Encrypt';
import {promisify} from 'util';
import {readFile, writeFile} from 'fs';
import {join} from 'path';
import {Decrypt} from '../../../../src/plugins/fs/Decrypt';
import * as assert from 'assert';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

@suite()
class CryptoTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new Encrypt();
        const context = FlowService.generateEmptyContext();
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
        const actionHandler = new Encrypt();
        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        actionHandler.validate({
            password: 'secret',
            include: ['/tmp'],
            exclude: ['/tmp/.gitignore']
        }, context, snapshot);

        actionHandler.validate({
            password: 'secret',
            include: ['/tmp']
        }, context, snapshot);
    }

    @test()
    async decryptFiles(): Promise<void> {
        const encryptActionHandler = new Encrypt();
        const decryptActionHandler = new Decrypt();

        const tmpDir = await tmp.dir();
        const writeFileAsync = promisify(writeFile);
        const readFileAsync = promisify(readFile);

        const context = FlowService.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, tmpDir.path, 0);

        const files = [
            join(tmpDir.path, 'a.txt'),
            join(tmpDir.path, 'b.txt'),
            join(tmpDir.path, 'c.ign'),
        ];

        const fileContent = 'test@'.repeat(100);

        for (const file of files) {
            await writeFileAsync(file, fileContent, 'utf8');
        }

        const password = 'super_secret_password';

        await encryptActionHandler.execute({
            password: password,
            include: ['*.txt'],
            exclude: ['*.ign']
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
            include: ['*.txt'],
            exclude: ['*.ign']
        }, context, snapshot);

        for (const file of files) {
            const content = await readFileAsync(file, 'utf8');
            assert.strictEqual(content, fileContent);
        }
    }
}