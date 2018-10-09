import {suite, test} from 'mocha-typescript';
import {AttachedFlowActionHandler} from '../../../../src/plugins/flow/AttachedFlowActionHandler';
import {Container} from 'typedi';
import {ActionHandlersRegistry} from '../../../../src/services';
import {ActionHandler, ActionSnapshot} from '../../../../src/models';
import {createReadStream, writeFile} from 'fs';
import {promisify} from 'util';
import {dump} from 'js-yaml';
import * as assert from 'assert';
import {IActionHandlerMetadata} from '../../../../src/interfaces';
import {ContextUtil} from '../../../../src/utils';
import {dirname, join} from 'path';
import {c} from 'tar';
import {createServer, Server} from 'http';

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

    private server: Server | null = null;

    after() {
        Container.reset();
        if (this.server) {
            this.server.close();
            this.server = null;
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

        // create dummy static server
        let status = 200;
        this.server = createServer((request, response) => {
            const fileStream = createReadStream(tarballPath);

            response.writeHead(status);

            fileStream.on('data', function (data) {
                response.write(data);
            });

            fileStream.on('end', function() {
                response.end();
            });
        }).listen(61999);

        let url = 'http://localhost:61999';

        const actionHandler = new AttachedFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.tst = 123;

        const snapshot = new ActionSnapshot('.', {}, '', 0);
        await actionHandler.validate(url, context, snapshot);
        await actionHandler.execute(url, context, snapshot);

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);

        // expect to reject on non 200 status
        status = 404;
        await chai.expect(
            actionHandler.execute(url, context, snapshot)
        ).to.be.rejected;

        // expect to reject on invalid url
        url = 'https://localhost:61888';
        await chai.expect(
            actionHandler.execute(url, context, snapshot)
        ).to.be.rejected;
    }
}
