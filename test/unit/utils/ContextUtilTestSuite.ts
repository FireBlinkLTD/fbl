import {suite} from 'mocha-typescript';
import {ContextUtil} from '../../../src/utils';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class ContextUtilTestSuite {
    @test()
    async failOnInvalidFieldPath(): Promise<void> {
        await chai.expect(
            ContextUtil.assignToField({}, 'field', 'test')
        ).to.be.rejected;
    }

    @test()
    async failOnInvalidObjectPath(): Promise<void> {
        await chai.expect(
            ContextUtil.assign({}, 'field', { test: true })
        ).to.be.rejected;
    }

    @test()
    async failOnBaseValueForRootPath(): Promise<void> {
        await chai.expect(
            ContextUtil.assign({}, '$', 1)
        ).to.be.rejected;
    }
}
