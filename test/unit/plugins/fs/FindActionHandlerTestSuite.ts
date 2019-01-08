import {suite, test} from 'mocha-typescript';
import {ActionSnapshot} from '../../../../src/models';
import {join} from 'path';
import {existsSync, writeFile} from 'fs';
import * as assert from 'assert';
import {promisify} from 'util';
import {FSUtil, ContextUtil} from '../../../../src/utils';
import {homedir} from 'os';
import {Container} from 'typedi';
import {TempPathsRegistry} from '../../../../src/services';
import { FindActionHandler } from '../../../../src/plugins/fs/FindActionHandler';
import { IDelegatedParameters } from '../../../../src';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite
class CopyPathActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new FindActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                include: []
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                include: [
                    '/test/*'
                ]
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new FindActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate({
            include: ['/tmp/'],
            result: {
                assignTo: '$.ctx.test'
            }
        }, context, snapshot, {});        

        await actionHandler.validate({
            include: ['/tmp/'],
            exclude: ['/tpm/.*'],
            result: {
                pushTo: '$.ctx.test'
            }
        }, context, snapshot, {});
    }

    @test()
    async execute(): Promise<void> {
        const actionHandler = new FindActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const tmpDir = await Container.get(TempPathsRegistry).createTempDir();
        await FSUtil.mkdirp(join(tmpDir, 'a/b/c'));
        const writeFileAsync = promisify(writeFile);

        snapshot.wd = tmpDir;

        const files = [
            '1.txt',
            '2.txt',
            'a/2.txt',
            'a/b/3.ign',
            'a/b/c/4.txt',
        ];

        for (const file of files) {
            await writeFileAsync(join(tmpDir, file), '', 'utf8');
        }

        const parameters: IDelegatedParameters = {
            parameters: {}
        }
        
        await actionHandler.execute({
            include: ['**/*'],
            result: {
                assignTo: '$.parameters.test1A',
                pushTo: '$.parameters.test1B',
            }
        }, context, snapshot, parameters);

        assert.deepStrictEqual(parameters.parameters.test1A, files.map(f => join(tmpDir, f)));
        assert.deepStrictEqual(parameters.parameters.test1B, [files.map(f => join(tmpDir, f))]);

        await actionHandler.execute({
            include: ['**/*'],
            exclude: ['**/*.ign'],
            result: {
                assignTo: '$.parameters.test2A',
                pushTo: '$.parameters.test2B',
            }
        }, context, snapshot, parameters);

        assert.deepStrictEqual(parameters.parameters.test2A, files.filter(f => f.endsWith('.txt')).map(f => join(tmpDir, f)));
        assert.deepStrictEqual(parameters.parameters.test2B, [files.filter(f => f.endsWith('.txt')).map(f => join(tmpDir, f))]);
    }
}