import {suite, test} from 'mocha-typescript';
import {ContextUtil} from '../../../src/utils';
import {ActionSnapshot} from '../../../src/models';
import * as assert from 'assert';
import {IDelegatedParameters} from '../../../src/interfaces';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class ContextUtilTestSuite {
    @test()
    async failAssignmentOnInvalidFieldPath(): Promise<void> {
        await chai.expect(
            ContextUtil.assignToField({}, 'field', 'test', false)
        ).to.be.rejected;
    }

    @test()
    async failAssignmentOnInvalidObjectPath(): Promise<void> {
        await chai.expect(
            ContextUtil.assign({}, 'field', { test: true }, false)
        ).to.be.rejected;
    }

    @test()
    async failAssignmentForRootPath(): Promise<void> {
        await chai.expect(
            ContextUtil.assign({}, '$', 1, false)
        ).to.be.rejected;
    }

    @test()
    async failPushOnInvalidFieldPath(): Promise<void> {
        await chai.expect(
            ContextUtil.push({}, 'field', 'test', false)
        ).to.be.rejected;
    }

    @test()
    async failPushForNonArrayTarget(): Promise<void> {
        await chai.expect(
            ContextUtil.push({
                test: {}
            }, '$.test', 1, false)
        ).to.be.rejectedWith(
            'Unable to push value to path: $.test. Target is not array.'
        );
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
    async assignToByString(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const parameters = {};
        const snapshot = new ActionSnapshot('test', {}, '.', 0, parameters);

        await ContextUtil.assignTo(context, parameters, snapshot, '$.ctx.test', 'test', false);
        assert.deepStrictEqual(context.ctx, {
            test: 'test'
        });
    }

    @test()
    async pushToByString(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const parameters = {};
        const snapshot = new ActionSnapshot('test', {}, '.', 0, parameters);

        await ContextUtil.pushTo(context, parameters, snapshot, '$.ctx.test', 'test', false, false);
        assert.deepStrictEqual(context.ctx, {
            test: ['test']
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
        }, 'test', false);

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

    @test()
    async pushTo(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const parameters = {};
        const snapshot = new ActionSnapshot('test', {}, '.', 0, parameters);

        await ContextUtil.pushTo(context, parameters, snapshot, {
            ctx: '$.ctx_test',
            secrets: '$.secrets_test',
            parameters: '$.parameters_test'
        }, 'test', false, false);

        assert.deepStrictEqual(context.ctx, {
            ctx_test: ['test']
        });

        assert.deepStrictEqual(context.secrets, {
            secrets_test: ['test']
        });

        assert.deepStrictEqual(parameters, {
            parameters: {
                parameters_test: ['test']
            }
        });
    }

    @test()
    async resolveReferences(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const parameters = <IDelegatedParameters> {
            parameters: {
                test_parameters: 'p'
            },
            iteration: {
                index: 0,
                value: 'value'
            }
        };

        context.cwd = '/cwd';
        context.ctx = {
            test_ctx: 'c'
        };

        context.secrets = {
            test_secrets: 's'
        };

        const result = ContextUtil.resolveReferences({
            ctx: '$ref:ctx.test_ctx',
            secrets: '$ref:secrets.test_secrets',
            parameters: '$ref:parameters.test_parameters',
            iteration: '$ref:iteration ',
            cwd: ' $ref:cwd',
            array: [
                {
                    arr1: '$ref:ctx.test_ctx'
                }
            ]
        }, context, parameters);

        assert.deepStrictEqual(result, {
            cwd: '/cwd',
            ctx: 'c',
            secrets: 's',
            parameters: 'p',
            iteration: {
                index: 0,
                value: 'value'
            },
            array: [{
                arr1: 'c'
            }]
        });

        // check missing
        const missing: any = null;
        assert.strictEqual(ContextUtil.resolveReferences(missing, context, parameters), null);

        // check errors
        chai.expect(() => {
            ContextUtil.resolveReferences({
                test: '$ref:ctx.test_ctx_missing'
            }, context, parameters);
        }).to.throw(
            `Unable to find reference match for $.ctx.test_ctx_missing. Missing value found upon traveling the path at: test_ctx_missing`
        );

        // check errors
        chai.expect(() => {
            ContextUtil.resolveReferences({
                test: '$ref:ctx.test_ctx.missing'
            }, context, parameters);
        }).to.throw(
            `Unable to find reference match for $.ctx.test_ctx.missing. Non-object value found upon traveling the path at: missing`
        );
    }
}
