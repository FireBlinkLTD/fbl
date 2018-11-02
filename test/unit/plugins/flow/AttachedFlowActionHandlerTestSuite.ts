import {suite, test} from 'mocha-typescript';
import {AttachedFlowActionHandler} from '../../../../src/plugins/flow/AttachedFlowActionHandler';
import {Container} from 'typedi';
import {ActionHandlersRegistry, TempPathsRegistry} from '../../../../src/services';
import {ActionHandler, ActionSnapshot} from '../../../../src/models';
import {writeFile} from 'fs';
import {promisify} from 'util';
import {dump} from 'js-yaml';
import * as assert from 'assert';
import {IActionHandlerMetadata, IFlowLocationOptions} from '../../../../src/interfaces';
import {ContextUtil} from '../../../../src/utils';
import {dirname, join} from 'path';
import {c} from 'tar';
import {ChildProcess, fork} from 'child_process';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

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

interface IDummyServerWrapperConfig {
    port: number;
    status?: number;
    delay?: number;
    file?: string;
    ignoreRequest?: boolean;
    redirectTo?: string;
}

class DummyServerWrapper {
    public requestCount = 0;

    private server: ChildProcess | null = null;
    private onServerClose: Function | null = null;
    public lastRequest: any;

    constructor(public config: IDummyServerWrapperConfig) {
        if (this.config.redirectTo) {
            this.config.status = 302;
        }
    }

    private prepareOptions(): string[] {
        const options = [
            '-p', this.config.port.toString(),
            '-s', this.config.status.toString(),
            '-t', '1'
        ];

        if (this.config.delay) {
            options.push('-d', this.config.delay.toString());
        }

        if (this.config.ignoreRequest) {
            options.push('--ignore-request');
        }

        if (this.config.redirectTo) {
            options.push('-h', JSON.stringify({
                Location: this.config.redirectTo
            }));
        }

        options.push(this.config.file || 'missing_file.txt');

        return options;
    }

    /**
     * Start server
     * @return {Promise<void>}
     */
    async start(): Promise<void> {
        await this.stop();

        const options = this.prepareOptions();

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

        this.server.on('close', (code, signal) => {
            console.log('-> Server is stopped. Code: ' + code + '. Signal: ' + signal);
            this.server = null;

            if (this.onServerClose) {
                this.onServerClose();
                this.onServerClose = null;
            }
        });

        await new Promise((resolve, reject) => {
            this.server.on('message', (msg: any) => {
                if (msg.name === 'onRequest') {
                    this.requestCount++;
                    this.lastRequest = msg.payload;
                }

                if (msg.name === 'started') {
                    return resolve();
                }

                if (msg.name === 'failed') {
                    return reject(new Error('Server failed to start'));
                }
            });
        });
    }

    async stop(): Promise<void> {
        if (this.server) {
            console.log('-> Killing server...');

            // give system time to free port
            await new Promise(resolve => {
                this.onServerClose = resolve;
                this.server.kill('SIGINT');
            });
        }
    }
}

@suite()
class AttachedFlowActionHandlerTestSuite {

    private dummyServerWrappers: DummyServerWrapper[] = [];

    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();

        for (const dummyServerWrapper of this.dummyServerWrappers) {
            await dummyServerWrapper.stop();
        }

        this.dummyServerWrappers = [];
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

        await chai.expect(
            actionHandler.validate({
                path: '/tmp',
                target: []
            }, context, snapshot)
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

        await chai.expect(
            actionHandler.validate({
                path: '/tmp'
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                path: '/tmp',
                http: {
                    headers: {
                        test: 'yes'
                    }
                }
            }, context, snapshot)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.validate({
                path: '/tmp',
                target: 'yes'
            }, context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async processAttachedFlow(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
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

        const tmpFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(tmpFile, dump(subFlow), 'utf8');

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(tmpFile, context, snapshot);
        await actionHandler.execute(tmpFile, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    @test()
    async failOnAttachedFileWithTarget(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
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

        const tmpFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(tmpFile, dump(subFlow), 'utf8');

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const options = {
            path: tmpFile,
            target: tmpFile
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(options, context, snapshot);

        await chai.expect(
            actionHandler.execute(options, context, snapshot),
            `Usage of target is not allowed for flow at path: ${tmpFile}`
        ).to.be.rejected;
    }

    @test()
    async directoryAsPath(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
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

        const tmpDir = await tempPathsRegistry.createTempDir();

        await promisify(writeFile)(join(tmpDir, 'index.yml'), dump(subFlow), 'utf8');

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(tmpDir, context, snapshot);
        await actionHandler.execute(tmpDir, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    @test()
    async tarballAsPath(): Promise<void> {
        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;

        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest((opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        });

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
    async validUrlAsPath(): Promise<void> {
        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;

        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest((opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        });

        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 200,
            file: tarballPath
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const url = `http://localhost:${port}`;
        await actionHandler.validate(url, context, snapshot);
        await actionHandler.execute(url, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    @test()
    async invalidUrlAsPath(): Promise<void> {
        const actionHandler = new AttachedFlowActionHandler();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        console.log('-> Send request to invalid URL');
        // expect to reject on invalid url
        const url = 'https://localhost:61888';
        await chai.expect(
            actionHandler.execute(url, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async notFoundUrlAsPath(): Promise<void> {
        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest();

        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 404,
            file: tarballPath
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        const context = ContextUtil.generateEmptyContext();

        const url = `http://localhost:${port}`;
        await chai.expect(
            actionHandler.execute(url, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async validUrlAsPathWithNetworkError(): Promise<void> {
        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest();

        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 200,
            ignoreRequest: true,
            file: tarballPath
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();
        const snapshot = new ActionSnapshot('.', {}, '', 0);
        const context = ContextUtil.generateEmptyContext();

        setTimeout(() => {
            server.stop().catch((err) => {
                throw err;
            });
        }, 100);

        const url = `http://localhost:${port}`;
        await actionHandler.validate(url, context, snapshot);

        await chai.expect(
            actionHandler.execute(url, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async singleRequestForParallelActionsOnUrlAsPath(): Promise<void> {
        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest();

        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 200,
            file: tarballPath,
            delay: 100
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        const context = ContextUtil.generateEmptyContext();

        const url = `http://localhost:${port}`;
        await actionHandler.validate(url, context, snapshot);

        await Promise.all([
            actionHandler.execute(url, context, snapshot),
            actionHandler.execute(url, context, snapshot),
            actionHandler.execute(url, context, snapshot)
        ]);

        assert.strictEqual(server.requestCount, 1);
    }

    @test()
    async singleRequestForSequentialActionsOnUrlAsPath(): Promise<void> {
        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest();

        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 200,
            file: tarballPath
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        const context = ContextUtil.generateEmptyContext();

        const url = `http://localhost:${port}`;
        await actionHandler.validate(url, context, snapshot);

        await actionHandler.execute(url, context, snapshot);
        await actionHandler.execute(url, context, snapshot);
        await actionHandler.execute(url, context, snapshot);

        assert.strictEqual(server.requestCount, 1);
    }

    @test()
    async httpHeaders(): Promise<void> {
        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;

        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest((opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        });

        // file server
        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 200,
            file: tarballPath
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();
        const snapshot = new ActionSnapshot('.', {}, '', 0);
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const url = `http://localhost:${port}`;
        const options = <IFlowLocationOptions> {
            path: url,
            http: {
                headers: {
                    test: 'yes'
                }
            }
        };

        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);

        assert.strictEqual(server.lastRequest.headers.test, options.http.headers.test);
    }

    @test()
    async customTarget(): Promise<void> {
        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;

        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest((opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        }, 'flow.yml');

        const actionHandler = new AttachedFlowActionHandler();
        const snapshot = new ActionSnapshot('.', {}, '', 0);
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const options = <IFlowLocationOptions> {
            path: tarballPath,
            target: 'flow.yml'
        };

        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    @test()
    async httpRedirectUrlAsPath(): Promise<void> {
        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;

        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest((opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        });

        // file server
        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 200,
            file: tarballPath
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        // redirect server
        const redirectServer = new DummyServerWrapper({
            port: port + 1,
            redirectTo: `http://localhost:${port}`
        });
        this.dummyServerWrappers.push(redirectServer);
        await redirectServer.start();

        const actionHandler = new AttachedFlowActionHandler();
        const snapshot = new ActionSnapshot('.', {}, '', 0);
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const url = `http://localhost:${port + 1}`;

        await actionHandler.validate(url, context, snapshot);
        await actionHandler.execute(url, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    private static async prepareForTarballTest(dummyActionHandlerFn?: Function, fileName = 'index.yml'): Promise<string> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler((opts: any, ctx: any) => {
            if (dummyActionHandlerFn) {
                dummyActionHandlerFn(opts, ctx);
            }
        });

        actionHandlersRegistry.register(dummyActionHandler);

        const subFlow = {
            version: '1.0.0',
            pipeline: {
                [DummyActionHandler.ID]: true
            }
        };

        const tmpDir = await tempPathsRegistry.createTempDir();

        const indexYmlPath = join(tmpDir, fileName);
        const tarballPath = join(tmpDir, 'test.tar.gz');

        await promisify(writeFile)(indexYmlPath, dump(subFlow), 'utf8');

        await c({
            gzip: true,
            cwd: dirname(tarballPath),
            file: tarballPath
        }, [
            fileName
        ]);

        return tarballPath;
    }
}
