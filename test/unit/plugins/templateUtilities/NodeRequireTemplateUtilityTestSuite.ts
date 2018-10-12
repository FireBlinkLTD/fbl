import {suite, test} from 'mocha-typescript';
import * as assert from 'assert';
import {NodeRequireTemplateUtility} from '../../../../src/plugins/templateUtilities/NodeRequireTemplateUtility';

@suite()
class NodeRequireTemplateUtilityTestSuite {
    @test()
    async test(): Promise<void> {
        const utilityRequire = new NodeRequireTemplateUtility().getUtilities('.').require;
        const result = utilityRequire('path').join('/tmp', 'test');
        assert.strictEqual(result, '/tmp/test');
    }
}
