import {suite, test} from 'mocha-typescript';
import {HashTemplateUtility} from '../../../../src/plugins/templateUtilities/HashTemplateUtility';
import * as assert from 'assert';

@suite()
class HashTemplateUtilityTestSuite {
    @test()
    async makeHash(): Promise<void> {
        const hash = new HashTemplateUtility().getUtilities('.').hash;
        assert(hash);

        let hex = hash('test', 'md5', 'hex');
        assert.strictEqual(hex, '098f6bcd4621d373cade4e832627b4f6');

        hex = hash('test');
        assert.strictEqual(hex, '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');

        hex = hash('test', 'sha256', 'base64');
        assert.strictEqual(hex, 'n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=');
    }
}
