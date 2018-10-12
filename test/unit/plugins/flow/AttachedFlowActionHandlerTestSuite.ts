import {suite, test} from 'mocha-typescript';
import {AttachedFlowActionHandler} from '../../../../src/plugins/flow/AttachedFlowActionHandler';
import {Container} from 'typedi';
import {ActionHandlersRegistry} from '../../../../src/services';
import {ActionHandler, ActionSnapshot} from '../../../../src/models';
import {writeFile} from 'fs';
import {promisify} from 'util';
import {dump} from 'js-yaml';
import * as assert from 'assert';
import {IActionHandlerMetadata} from '../../../../src/interfaces';
import {ContextUtil} from '../../../../src/utils';
import {dirname, join} from 'path';
import {c} from 'tar';
import {ChildProcess, fork} from 'child_process';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const tmp = require('tmp-promise');

class DummyActionHandler extends ActionHandler {
    static ID = 'testHandler';

    constructor(
        private fn: Function
    ) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return  <IActionHandlerMetadata> {
            id: DummyActionHandler.ID,
            version: '1.0.0'
        };
    }

    async execute(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        await this.fn(options, context, snapshot);
    }
}

@suite()
export class AttachedFlowActionHandlerTestSuite {

    private server: ChildProcess | null = null;
    private onServerClose: Function | null = null;

    async after(): Promise<void> {
        Container.reset();
        await this.killServer();
    }

    /**
     * Spawn server
     * @param {number} port
     * @param {number} status
     * @param {string} file
     * @param {boolean} ignoreRequest
     * @return {"child_process".ChildProcess}
     */
    private async spawnServer(port: number, status: number, file: string, ignoreRequest = false): Promise<void> {
        await this.killServer();

        console.log('-> Starting server on port: ' + port + ' that returns status: ' + status + ' and ignores request: ' + ignoreRequest);

        const options = [
            '-p', port.toString(),
            '-s', status.toString(),
            '-t', '1',
        ];

        if (ignoreRequest) {
            options.push('--ignore-request');
        }

        options.push(file);

        this.server = fork('dummy.http.server', options, {
            cwd: join(__dirname, '../../../assets'),
            silent: true
        });

        this.server.stdout.on('data', (data) => {
            console.error(`-> Server.stdout: ${data.toString().trim()}`);
        });

        this.server.stderr.on('data', (data) => {
            console.error(`-> Server.stderr: ${data.toString().trim()}`);
        });

        this.server.on('close', (code) => {
            console.log('-> Server is stopped. Code: ' + code);
            this.server = null;

            if (this.onServerClose) {
                this.onServerClose();
                this.onServerClose = null;
            }
        });

        await new Promise((resolve, reject) => {
            this.server.on('message', (msg) => {
                if (msg === 'started') {
                    return resolve();
                }

                if (msg === 'failed') {
                    return reject(new Error('Server failed to start'));
                }
            });
        });
    }

    /**
     * Kill http server if running
     */
    private async killServer(): Promise<void> {
        if (this.server) {
            console.log('-> Killing server...');

            // give system time to free port
            await new Promise(resolve => {
                this.onServerClose = resolve;
                this.server.kill('SIGINT');
            });
        }
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);
        
        await chai.expect(
            actionHandler.validate(123, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('', context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate('/tmp/test.tst', context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async processAttachedFlow(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;
        const dummyActionHandler = new DummyActionHandler(async (opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        });

        actionHandlersRegistry.register(dummyActionHandler);

        const subFlow = {
            version: '1.0.0',
            pipeline: {
                [DummyActionHandler.ID]: true
            }
        };

        const tmpFile = await tmp.file();

        await promisify(writeFile)(tmpFile.path, dump(subFlow), 'utf8');

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(tmpFile.path, context, snapshot);
        await actionHandler.execute(tmpFile.path, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    @test()
    async directoryAsPath(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;
        const dummyActionHandler = new DummyActionHandler(async (opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        });

        actionHandlersRegistry.register(dummyActionHandler);

        const subFlow = {
            version: '1.0.0',
            pipeline: {
                [DummyActionHandler.ID]: true
            }
        };

        const tmpDir = await tmp.dir();

        await promisify(writeFile)(join(tmpDir.path, 'index.yml'), dump(subFlow), 'utf8');

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(tmpDir.path, context, snapshot);
        await actionHandler.execute(tmpDir.path, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    @test()
    async tarballAsPath(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;
        const dummyActionHandler = new DummyActionHandler(async (opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        });

        actionHandlersRegistry.register(dummyActionHandler);

        const subFlow = {
            version: '1.0.0',
            pipeline: {
                [DummyActionHandler.ID]: true
            }
        };

        const tmpDir = await tmp.dir();

        const indexYmlPath = join(tmpDir.path, 'index.yml');
        const tarballPath = join(tmpDir.path, 'test.tar.gz');

        await promisify(writeFile)(indexYmlPath, dump(subFlow), 'utf8');

        await c({
            gzip: true,
            cwd: dirname(tarballPath),
            file: tarballPath
        }, [
            'index.yml'
        ]);

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(tarballPath, context, snapshot);
        await actionHandler.execute(tarballPath, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    @test()
    async httpUrlAsPath(): Promise<void> {
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;
        const dummyActionHandler = new DummyActionHandler(async (opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        });

        actionHandlersRegistry.register(dummyActionHandler);

        const subFlow = {
            version: '1.0.0',
            pipeline: {
                [DummyActionHandler.ID]: true
            }
        };

        const tmpDir = await tmp.dir();

        const indexYmlPath = join(tmpDir.path, 'index.yml');
        const tarballPath = join(tmpDir.path, 'test.tar.gz');

        await promisify(writeFile)(indexYmlPath, dump(subFlow), 'utf8');

        await c({
            gzip: true,
            cwd: dirname(tarballPath),
            file: tarballPath
        }, [
            'index.yml'
        ]);

        const port = 61222;
        await this.spawnServer(port, 200, tarballPath);
        let url = `http://localhost:${port}`;

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(url, context, snapshot);

        console.log('-> Send request to a valid URL');
        await actionHandler.execute(url, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);

        console.log('-> Send request to invalid URL');
        // expect to reject on invalid url
        url = 'https://localhost:61888';
        await chai.expect(
            actionHandler.execute(url, context, snapshot)
        ).to.be.rejected;

        console.log('-> Send request to valid URL but server returns 404 status code');
        // expect to reject on non 200 status
        url = `http://localhost:${port}`;
        await this.spawnServer(port, 404, tarballPath);

        await chai.expect(
            actionHandler.execute(url, context, snapshot)
        ).to.be.rejected;

        console.log('-> Send request to valid URL but server ignores the response');
        await this.spawnServer(port, 200, tarballPath, true);

        setTimeout(() => {
            this.killServer().catch((err) => {
                throw err;
            });
        }, 100);

        await chai.expect(
            actionHandler.execute(url, context, snapshot)
        ).to.be.rejected;
    }
}
