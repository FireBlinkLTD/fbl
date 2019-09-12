import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { NodeRequireTemplateUtility } from '../../../../src/plugins/templateUtilities/NodeRequireTemplateUtility';
import { ContextUtil, ActionSnapshot } from '../../../../src';

@suite()
class NodeRequireTemplateUtilityTestSuite {
    @test()
    async test(): Promise<void> {
        const utilityRequire = new NodeRequireTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('.', '', {}, '.', 0, {}),
            {},
        ).require;
        const result = utilityRequire('path').join('/tmp', 'test');
        assert.strictEqual(result, '/tmp/test');
    }
}
