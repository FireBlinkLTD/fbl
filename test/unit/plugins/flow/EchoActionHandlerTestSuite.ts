import { test, suite } from 'mocha-typescript';
import { ActionSnapshot } from '../../../../src/models';
import { ContextUtil } from '../../../../src/utils';
import { EchoActionHandler } from '../../../../src/plugins/flow/EchoActionHandler';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite
class EchoActionHandlerTestSuite {
    @test()
    async execution(): Promise<void> {
        const actionHandler = new EchoActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor('test', context, snapshot, {});
        await processor.validate();
        await processor.execute();
    }
}
