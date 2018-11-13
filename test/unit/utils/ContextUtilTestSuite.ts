import {suite} from 'mocha-typescript';
import {ContextUtil} from '../../../src/utils';
import {ActionSnapshot} from '../../../src/models';
import * as assert from 'assert';

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

    @test()
    async assignTo(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const parameters = {};
        const snapshot = new ActionSnapshot('test', {}, '.', 0, parameters);

        await ContextUtil.assignTo(context, parameters, snapshot, {
            ctx: '$.ctx_test',
            secrets: '$.secrets_test',
            parameters: '$.parameters_test'
        }, 'test');

        assert.deepStrictEqual(context.ctx, {
            ctx_test: 'test'
        });

        assert.deepStrictEqual(context.secrets, {
            secrets_test: 'test'
        });

        assert.deepStrictEqual(parameters, {
            parameters: {
                parameters_test: 'test'
            }
        });
    }
}
