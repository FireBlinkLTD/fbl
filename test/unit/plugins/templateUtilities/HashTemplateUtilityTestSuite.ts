import { suite, test } from 'mocha-typescript';
import { HashTemplateUtility } from '../../../../src/plugins/templateUtilities/HashTemplateUtility';
import * as assert from 'assert';
import { ContextUtil, ActionSnapshot } from '../../../../src';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class HashTemplateUtilityTestSuite {
    @test()
    async makeHash(): Promise<void> {
        const hash = new HashTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('.', '', {}, '.', 0, {}),
            {},
        ).hash;
        assert(hash);

        let hex = hash('test', 'md5', 'hex');
        assert.strictEqual(hex, '098f6bcd4621d373cade4e832627b4f6');

        hex = hash('test');
        assert.strictEqual(hex, '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');

        hex = hash('test', 'sha256', 'base64');
        assert.strictEqual(hex, 'n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=');
    }

    @test()
    async validation(): Promise<void> {
        const hash = new HashTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('.', '', {}, '.', 0, {}),
            {},
        ).hash;
        assert(hash);

        chai.expect(() => {
            hash(undefined);
        }).to.throw('Unable to calculate hash of missing value');

        chai.expect(() => {
            hash(12345);
        }).to.throw('Unable to calculate hash of non-string value');
    }
}
