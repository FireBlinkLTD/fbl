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
    async failAssignmentOnInvalidFieldPath(): Promise<void> {
        await chai.expect(
            ContextUtil.assignToField({}, 'field', 'test')
        ).to.be.rejected;
    }

    @test()
    async failAssignmentOnInvalidObjectPath(): Promise<void> {
        await chai.expect(
            ContextUtil.assign({}, 'field', { test: true })
        ).to.be.rejected;
    }

    @test()
    async failAssignmentForRootPath(): Promise<void> {
        await chai.expect(
            ContextUtil.assign({}, '$', 1)
        ).to.be.rejected;
    }

    @test()
    async failPushOnInvalidFieldPath(): Promise<void> {
        await chai.expect(
            ContextUtil.push({}, 'field', 'test', false)
        ).to.be.rejected;
    }

    @test()
    async failPushForRootPath(): Promise<void> {
        await chai.expect(
            ContextUtil.push({}, '$', 1, false),
            'Unable to push value to path $. Path has invalid format.'
        ).to.be.rejected;
    }

    @test()
    async failPushForNonArrayTarget(): Promise<void> {
        await chai.expect(
            ContextUtil.push({
                test: {}
            }, '$.test', 1, false),
            'Unable to push child records of value to path $.test Value is not an array.'
        ).to.be.rejected;
    }

    @test()
    async failForWrongTarget(): Promise<void> {
        await chai.expect(
            ContextUtil.push({
                l1: []
            }, '$.l1.l2', 1, false)
        ).to.be.rejected;

        await chai.expect(
            ContextUtil.push({
                l1: {
                    l2: {}
                }
            }, '$.l1.l2', 1, false)
        ).to.be.rejected;
    }

    @test()
    async failPushOfChildrenOnNonArrayValue(): Promise<void> {
        await chai.expect(
            ContextUtil.push({
                l1: []
            }, '$.l1', 1, true)
        ).to.be.rejected;
    }

    @test()
    async push(): Promise<void> {
        const obj = {};

        await ContextUtil.push(obj, '$.l1.l2', 1, false);
        assert.deepStrictEqual(obj, {
            l1: {
                l2: [1]
            }
        });
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
