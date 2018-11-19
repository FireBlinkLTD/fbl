import {suite, test} from 'mocha-typescript';
import {EscapeTemplateUtility} from '../../../../src/plugins/templateUtilities/EscapeTemplateUtility';
import * as assert from 'assert';

@suite()
class EscapeTemplateUtilityTestSuite {
    @test()
    async test(): Promise<void> {
        const escape = new EscapeTemplateUtility().getUtilities('.').escape;
        assert(escape);

        assert.strictEqual(escape({}), '{}');
        assert.strictEqual(escape([]), '[]');
        assert.strictEqual(escape(1), 1);
        assert.strictEqual(escape(true), true);
        assert.strictEqual(escape('@""'), '"@\\"\\""');
    }
}
