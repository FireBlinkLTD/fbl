import {suite, test} from 'mocha-typescript';
import {EscapeTemplateUtility} from '../../../../src/plugins/templateUtilities/EscapeTemplateUtility';
import * as assert from 'assert';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class EscapeTemplateUtilityTestSuite {
    @test()
    async test(): Promise<void> {
        const escape = new EscapeTemplateUtility().getUtilities('.').escape;
        assert(escape);

        assert.strictEqual(escape(1), 1);
        assert.strictEqual(escape(true), true);
        assert.strictEqual(escape('@""'), '"@\\"\\""');

        chai.expect(() => {
            escape({});
        }).to.throw('Unable to escape value. Use $ref:path to pass value by reference.');

        chai.expect(() => {
            escape([]);
        }).to.throw('Unable to escape value. Use $ref:path to pass value by reference.');
    }
}
