import {suite, test} from 'mocha-typescript';
import {AttachedFlowHandler} from '../../../../src/plugins/flow/AttachedFlowHandler';
import {Container} from 'typedi';
import {ActionHandlersRegistry} from '../../../../src/services';
import {ActionHandler, IHandlerMetadata} from '../../../../src/models';
import {writeFile} from 'fs';
import {promisify} from 'util';
import {dump} from 'js-yaml';
import * as assert from 'assert';
import {IContext} from '../../../../src/interfaces';

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

    getMetadata(): IHandlerMetadata {
        return  <IHandlerMetadata> {
            id: DummyActionHandler.ID,
            version: '1.0.0'
        };
    }

    async execute(options: any, context: any): Promise<void> {
        await this.fn(options, context);
    }
}

@suite()
export class AttachedFlowHandlerTestSuite {

    after() {
        Container
            .get<ActionHandlersRegistry>(ActionHandlersRegistry)
            .unregister(DummyActionHandler.ID);
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new AttachedFlowHandler();

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };
        
        await chai.expect(
            actionHandler.validate(123, context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate('', context)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new AttachedFlowHandler();

        const context = <IContext> {
            ctx: {},
            wd: '.'
        };

        await chai.expect(
            actionHandler.validate('/tmp/test.tst', context)
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

        const actionHandler = new AttachedFlowHandler();
        const context = <IContext> {
            wd: '.',
            ctx: {
                tst: 123
            }
        };

        await chai.expect(
            actionHandler.validate(tmpFile.path, context)
        ).to.be.not.rejected;

        await chai.expect(
            actionHandler.execute(tmpFile.path, context)
        ).to.be.not.rejected;

        assert.strictEqual(actionHandlerOptions, true);
        assert.strictEqual(actionHandlerContext.ctx.tst, 123);
    }
}
