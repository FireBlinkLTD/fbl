import {suite, test} from 'mocha-typescript';
import {ToJSONTemplateUtility} from '../../../../src/plugins/templateUtilities/ToJSONTemplateUtility';
import * as assert from 'assert';

@suite()
class ToJSONTemplateUtilityTestSuite {
    @test()
    async test(): Promise<void> {
        const toJSON = new ToJSONTemplateUtility().getUtilities('.').toJSON;
        assert(toJSON);

        const jsonStr = toJSON({});
        assert.strictEqual(jsonStr, '{}');
    }
}
