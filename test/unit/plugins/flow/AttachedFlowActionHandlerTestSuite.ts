import { suite, test } from 'mocha-typescript';
import { AttachedFlowActionHandler } from '../../../../src/plugins/flow/AttachedFlowActionHandler';
import { Container } from 'typedi';
import { ActionHandlersRegistry, FlowService, TempPathsRegistry } from '../../../../src/services';
import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../../../src/models';
import { unlink, writeFile } from 'fs';
import { promisify } from 'util';
import { dump } from 'js-yaml';
import * as assert from 'assert';
import { IActionHandlerMetadata, IFlowLocationOptions, IPlugin } from '../../../../src/interfaces';
import { ContextUtil, FSUtil } from '../../../../src/utils';
import { dirname, join } from 'path';
import { c } from 'tar';
import { DummyServerWrapper } from '../../../assets/dummy.http.server.wrapper';
import { SequenceFlowActionHandler } from '../../../../src/plugins/flow/SequenceFlowActionHandler';
import { DummyActionHandler } from '../../fakePlugins/DummyActionHandler';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const plugin: IPlugin = {
    name: 'test',
    version: '1.0.0',
    requires: {
        fbl: '>=0.0.0',
    },
};

@suite()
class AttachedFlowActionHandlerTestSuite {
    private dummyServerWrappers: DummyServerWrapper[] = [];

    async after(): Promise<void> {
        for (const dummyServerWrapper of this.dummyServerWrappers) {
            await dummyServerWrapper.stop();

            const tarballFile = await FlowService.getCachedTarballPathForURL(
                `http://localhost:${dummyServerWrapper.config.port}`,
            );
            const exists = await FSUtil.exists(tarballFile);

            if (exists) {
                await promisify(unlink)(tarballFile);
            }
        }

        this.dummyServerWrappers = [];
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor('', context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        path: '/tmp',
                        target: [],
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
        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.getProcessor('/tmp/test.tst', context, snapshot, {}).validate();

        await actionHandler
            .getProcessor(
                {
                    path: '/tmp',
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
                    http: {
                        headers: {
                            test: 'yes',
                        },
                    },
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
                    target: 'yes',
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async processAttachedFlow(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        };

        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const subFlow = {
            version: '1.0.0',
            pipeline: {
                [dummyActionHandler.id]: true,
            },
        };

        const tmpFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(tmpFile, dump(subFlow), 'utf8');

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const processor = actionHandler.getProcessor(tmpFile, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    @test()
    async corruptedYAML(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async () => {
            // tslint:disable-next-line
        };

        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const subFlow = ['pipeline:', `  ${dummyActionHandler.id}:`, ' test: true'];

        const tmpFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(tmpFile, subFlow.join('\n'), 'utf8');

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const processor = await actionHandler.getProcessor(tmpFile, context, snapshot, {});

        await processor.validate();
        await chai.expect(processor.execute()).to.be.rejected;
    }

    @test()
    async failOnAttachedFileWithTarget(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async () => {
            // tslint:disable-next-line
        };

        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const subFlow = {
            version: '1.0.0',
            pipeline: {
                [dummyActionHandler.id]: true,
            },
        };

        const tmpFile = await tempPathsRegistry.createTempFile();

        await promisify(writeFile)(tmpFile, dump(subFlow), 'utf8');

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const options = {
            path: tmpFile,
            target: tmpFile,
        };

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();

        await chai
            .expect(processor.execute())
            .to.be.rejectedWith(`Usage of target is not allowed for flow at path: ${tmpFile}`);
    }

    @test()
    async directoryAsPath(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        };

        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const subFlow = {
            version: '1.0.0',
            pipeline: {
                [dummyActionHandler.id]: true,
            },
        };

        const tmpDir = await tempPathsRegistry.createTempDir();

        await promisify(writeFile)(join(tmpDir, 'index.yml'), dump(subFlow), 'utf8');

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const processor = actionHandler.getProcessor(tmpDir, context, snapshot, {});
        await processor.validate();
        await processor.execute();

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

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const processor = actionHandler.getProcessor(tarballPath, context, snapshot, {});
        await processor.validate();
        await processor.execute();

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
            file: tarballPath,
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const url = `http://localhost:${port}`;

        const processor = actionHandler.getProcessor(url, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    @test()
    async invalidUrlAsPath(): Promise<void> {
        const actionHandler = new AttachedFlowActionHandler();

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        console.log('-> Send request to invalid URL');
        // expect to reject on invalid url
        const url = 'https://localhost:61888';
        await chai.expect(actionHandler.getProcessor(url, context, snapshot, {}).execute()).to.be.rejected;
    }

    @test()
    async notFoundUrlAsPath(): Promise<void> {
        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest();

        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 404,
            file: tarballPath,
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();

        const url = `http://localhost:${port}`;
        await chai.expect(actionHandler.getProcessor(url, context, snapshot, {}).execute()).to.be.rejected;
    }

    @test()
    async validUrlAsPathWithNetworkError(): Promise<void> {
        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest();

        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 200,
            ignoreRequest: true,
            file: tarballPath,
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();

        setTimeout(() => {
            server.stop().catch(err => {
                throw err;
            });
        }, 100);

        const url = `http://localhost:${port}`;
        const processor = actionHandler.getProcessor(url, context, snapshot, {});
        await processor.validate();

        await chai.expect(processor.execute()).to.be.rejected;
    }

    @test()
    async singleRequestForParallelActionsOnUrlAsPath(): Promise<void> {
        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest();

        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 200,
            file: tarballPath,
            delay: 100,
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();

        const url = `http://localhost:${port}`;
        await actionHandler.getProcessor(url, context, snapshot, {}).validate();

        await Promise.all([
            actionHandler.getProcessor(url, context, snapshot, {}).execute(),
            actionHandler.getProcessor(url, context, snapshot, {}).execute(),
            actionHandler.getProcessor(url, context, snapshot, {}).execute(),
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
            file: tarballPath,
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();

        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();

        const url = `http://localhost:${port}`;
        await actionHandler.getProcessor(url, context, snapshot, {}).validate();

        await actionHandler.getProcessor(url, context, snapshot, {}).execute();
        await actionHandler.getProcessor(url, context, snapshot, {}).execute();
        await actionHandler.getProcessor(url, context, snapshot, {}).execute();

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
            file: tarballPath,
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const url = `http://localhost:${port}`;
        const options = <IFlowLocationOptions>{
            path: url,
            http: {
                headers: {
                    test: 'yes',
                },
            },
        };

        const processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);

        assert.strictEqual(server.lastRequest.headers.test, options.http.headers.test);
    }

    @test()
    async cachedTarballMatch(): Promise<void> {
        let actionHandlerOptions: any = null;
        let actionHandlerContext: any = null;

        const tarballPath = await AttachedFlowActionHandlerTestSuite.prepareForTarballTest(
            (opts: any, ctx: any) => {
                actionHandlerOptions = opts;
                actionHandlerContext = ctx;
            },
            'index.yml',
            'test',
        );

        // file server
        const port = 61222;
        const server = new DummyServerWrapper({
            port,
            status: 200,
            file: tarballPath,
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        const actionHandler = new AttachedFlowActionHandler();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const url = `http://localhost:${port}`;
        const options = <IFlowLocationOptions>{
            path: url,
            http: {
                headers: {
                    test: 'first',
                },
            },
            cache: true,
        };

        let processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);

        assert.strictEqual(server.lastRequest.headers.test, options.http.headers.test);

        // run one more time
        Container.reset();

        await server.stop();
        await server.start();

        actionHandlerOptions = null;
        context.ctx.tst = 124;
        options.http.headers.test = 'second';

        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.id = 'test';
        dummyActionHandler.executeFn = async (opts: any, ctx: any) => {
            actionHandlerOptions = opts;
            actionHandlerContext = ctx;
        };
        actionHandlersRegistry.register(dummyActionHandler, plugin);

        processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 124);
        assert.strictEqual(server.requestCount, 1);
        assert.strictEqual(server.lastRequest.headers.test, 'first');
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
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const options = <IFlowLocationOptions>{
            path: tarballPath,
            target: 'flow.yml',
        };

        const processor = actionHandler.getProcessor(options, context, snapshot, {});
        await processor.validate();
        await processor.execute();

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
            file: tarballPath,
        });
        this.dummyServerWrappers.push(server);
        await server.start();

        // redirect server
        const redirectServer = new DummyServerWrapper({
            port: port + 1,
            redirectTo: `http://localhost:${port}`,
        });
        this.dummyServerWrappers.push(redirectServer);
        await redirectServer.start();

        const actionHandler = new AttachedFlowActionHandler();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const url = `http://localhost:${port + 1}`;

        const processor = actionHandler.getProcessor(url, context, snapshot, {});
        await processor.validate();
        await processor.execute();

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }

    @test()
    async correctCacheMatch(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandlersRegistry = Container.get(ActionHandlersRegistry);
        const flowService = Container.get(FlowService);

        const tracked: any[] = [];
        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.executeFn = async (opts: any, ctx: any) => {
            tracked.push(opts);
        };

        const sequenceActionHandler = new SequenceFlowActionHandler();

        actionHandlersRegistry.register(dummyActionHandler, plugin);
        actionHandlersRegistry.register(new AttachedFlowActionHandler(), plugin);
        actionHandlersRegistry.register(sequenceActionHandler, plugin);

        const wd = await tempPathsRegistry.createTempDir();
        const dirA = join(wd, 'a');
        const dirB = join(wd, 'b');
        await FSUtil.mkdirp(dirA);
        await FSUtil.mkdirp(dirB);

        const indexFileContent = {
            pipeline: {
                '@': 'test.yml',
            },
        };

        const testAContent = {
            pipeline: {
                [dummyActionHandler.id]: 'a',
            },
        };

        const testBContent = {
            pipeline: {
                [dummyActionHandler.id]: 'b',
            },
        };

        await promisify(writeFile)(join(dirA, 'index.yml'), dump(indexFileContent));
        await promisify(writeFile)(join(dirA, 'test.yml'), dump(testAContent));

        await promisify(writeFile)(join(dirB, 'index.yml'), dump(indexFileContent));
        await promisify(writeFile)(join(dirB, 'test.yml'), dump(testBContent));

        const context = ContextUtil.generateEmptyContext();
        const snapshot = await flowService.executeAction(
            wd,
            {
                [sequenceActionHandler.getMetadata().id]: [
                    {
                        '@': 'a/',
                    },
                    {
                        '@': 'b/',
                    },
                ],
            },
            context,
            {},
        );

        assert(snapshot.successful);
        assert.deepStrictEqual(tracked, ['a', 'b']);
    }

    private static async prepareForTarballTest(
        dummyActionHandlerFn?: Function,
        fileName = 'index.yml',
        id = 'test',
    ): Promise<string> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

        const dummyActionHandler = new DummyActionHandler();
        dummyActionHandler.id = id;
        dummyActionHandler.executeFn = (opts: any, ctx: any) => {
            if (dummyActionHandlerFn) {
                dummyActionHandlerFn(opts, ctx);
            }
        };

        actionHandlersRegistry.register(dummyActionHandler, plugin);

        const subFlow = {
            version: '1.0.0',
            pipeline: {
                [dummyActionHandler.id]: true,
            },
        };

        const tmpDir = await tempPathsRegistry.createTempDir();

        const indexYmlPath = join(tmpDir, fileName);
        const tarballPath = join(tmpDir, 'test.tar.gz');

        await promisify(writeFile)(indexYmlPath, dump(subFlow), 'utf8');

        await c(
            {
                gzip: true,
                cwd: dirname(tarballPath),
                file: tarballPath,
            },
            [fileName],
        );

        return tarballPath;
    }
}
