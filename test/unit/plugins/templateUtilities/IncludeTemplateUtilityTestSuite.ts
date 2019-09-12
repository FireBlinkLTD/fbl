import { suite, test } from 'mocha-typescript';
import { IncludeTemplateUtility } from '../../../../src/plugins/templateUtilities/IncludeTemplateUtility';
import * as assert from 'assert';
import { ContextUtil, ActionSnapshot } from '../../../../src';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class IncludeTemplateUtilityTestSuite {
    @test()
    async failOnInvalidArgLength(): Promise<void> {
        const include = new IncludeTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('.', '', {}, '.', 0, {}),
            {},
            '.',
        ).include;
        assert(include);

        chai.expect(include()).to.be.rejectedWith('Unable to execute "$.include(path)". Path value is missing.');
    }
}
