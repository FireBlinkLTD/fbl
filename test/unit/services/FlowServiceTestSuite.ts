import {suite, test} from 'mocha-typescript';
import {Container} from 'typedi';
import {FlowService} from '../../../src/services';
import * as assert from 'assert';
import {homedir} from 'os';

@suite()
class FlowServiceTestSuite {
    @test()
    async getAbsolutePath(): Promise<void> {
        const flowService = Container.get(FlowService);
        assert.strictEqual(flowService.getAbsolutePath('~/test.tst', '/tmp'), homedir() + '/test.tst');
        assert.strictEqual(flowService.getAbsolutePath('/tmp/test.tst', '/var'), '/tmp/test.tst');
        assert.strictEqual(flowService.getAbsolutePath('./test.tst', '/var'), '/var/test.tst');
    }
}
