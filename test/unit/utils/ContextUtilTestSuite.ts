import { suite, test } from 'mocha-typescript';
import { ContextUtil } from '../../../src/utils';
import { ActionSnapshot } from '../../../src/models';
import * as assert from 'assert';
import { IDelegatedParameters } from '../../../src/interfaces';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class ContextUtilTestSuite {
    @test()
    async failGettingValueAtPath(): Promise<void> {
        chai.expect(() => {
            ContextUtil.getValueAtPath({}, '$.field.test');
        }).to.throw('Unable to get value at path "$.field.test". Sub-path "$.field" leads to non-object value.');
    }

    @test()
    async failToInstantiateObjectPath(): Promise<void> {
        chai.expect(() => {
            ContextUtil.instantiateObjectPath({}, '$');
        }).to.throw('Unable to instantiate child properties based on path "$". Path has invalid format.');

        chai.expect(() => {
            ContextUtil.instantiateObjectPath(
                {
                    test: '',
                },
                '$.test.field',
            );
        }).to.throw(
            'Unable to instantiate child properties based on path "$.test.field". Sub-path "$.test" leads to non-object value.',
        );
    }

    @test()
    async failToGetParentPath(): Promise<void> {
        chai.expect(() => {
            ContextUtil.getParentPath('$');
        }).to.throw('Unable to get parent path of "$". Path has invalid format.');
    }

    @test()
    async failAssignmentOnInvalidFieldPath(): Promise<void> {
        chai.expect(() => {
            ContextUtil.assignToField({}, 'field', 'test', false);
        }).to.throw('Unable to assign value to path "field". Path has invalid format.');
    }

    @test()
    async failAssignmentOnInvalidObjectPath(): Promise<void> {
        chai.expect(() => {
            ContextUtil.assign({}, 'field', { test: true }, false);
        }).to.throw('Unable to assign value to path "field". Path has invalid format.');
    }

    @test()
    async failAssignmentForRootPath(): Promise<void> {
        chai.expect(() => {
            ContextUtil.assign({}, '$', 1, false);
        }).to.throw('Unable to assign non-object value to root path.');
    }

    @test()
    async failPushOnInvalidFieldPath(): Promise<void> {
        chai.expect(() => {
            ContextUtil.push({}, 'field', 'test', false);
        }).to.throw('Unable to push value to path "field". Path has invalid format.');
    }

    @test()
    async failPushForNonArrayTarget(): Promise<void> {
        chai.expect(() => {
            ContextUtil.push(
                {
                    test: {},
                },
                '$.test',
                1,
                false,
            );
        }).to.throw('Unable to push value to path "$.test". Target is not array.');
    }

    @test()
    async failForWrongTarget(): Promise<void> {
        chai.expect(() => {
            ContextUtil.push(
                {
                    l1: [],
                },
                '$.l1.l2',
                1,
                false,
            );
        }).to.throw('Unable to assign path "$.l1.l2". Sub-path "$.l1" leads to non-object value.');

        chai.expect(() => {
            ContextUtil.push(
                {
                    l1: {
                        l2: {},
                    },
                },
                '$.l1.l2',
                1,
                false,
            );
        }).to.throw('Unable to push value to path "$.l1.l2". Target is not array.');
    }

    @test()
    async failPushOfChildrenOnNonArrayValue(): Promise<void> {
        chai.expect(() => {
            ContextUtil.push(
                {
                    l1: [],
                },
                '$.l1',
                1,
                true,
            );
        }).to.throw('Unable to push child records of value to path "$.l1". Value is not an array.');
    }

    @test()
    async push(): Promise<void> {
        const obj = {};

        await ContextUtil.push(obj, '$.l1.l2', 1, false);
        assert.deepStrictEqual(obj, {
            l1: {
                l2: [1],
            },
        });
    }

    @test()
    async assignToByString(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const parameters = {};
        const snapshot = new ActionSnapshot('.', 'test', {}, '.', 0, parameters);

        await ContextUtil.assignTo(context, parameters, snapshot, '$.ctx.test', 'test');
        assert.deepStrictEqual(context.ctx, {
            test: 'test',
        });
    }

    @test()
    async pushToByString(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const parameters = {};
        const snapshot = new ActionSnapshot('.', 'test', {}, '.', 0, parameters);

        await ContextUtil.pushTo(context, parameters, snapshot, '$.ctx.test', 'test');
        assert.deepStrictEqual(context.ctx, {
            test: ['test'],
        });
    }

    @test()
    async assignTo(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const parameters = {};
        const snapshot = new ActionSnapshot('.', 'test', {}, '.', 0, parameters);

        await ContextUtil.assignTo(
            context,
            parameters,
            snapshot,
            {
                ctx: '$.ctx_test',
                secrets: '$.secrets_test',
                parameters: '$.parameters_test',
            },
            'test',
        );

        assert.deepStrictEqual(context.ctx, {
            ctx_test: 'test',
        });

        assert.deepStrictEqual(context.secrets, {
            secrets_test: 'test',
        });

        assert.deepStrictEqual(parameters, {
            parameters: {
                parameters_test: 'test',
            },
        });
    }

    @test()
    async pushTo(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const parameters = {};
        const snapshot = new ActionSnapshot('.', 'test', {}, '.', 0, parameters);

        await ContextUtil.pushTo(
            context,
            parameters,
            snapshot,
            {
                ctx: '$.ctx_test',
                secrets: '$.secrets_test',
                parameters: '$.parameters_test',
            },
            'test',
        );

        assert.deepStrictEqual(context.ctx, {
            ctx_test: ['test'],
        });

        assert.deepStrictEqual(context.secrets, {
            secrets_test: ['test'],
        });

        assert.deepStrictEqual(parameters, {
            parameters: {
                parameters_test: ['test'],
            },
        });
    }

    @test()
    async resolveReferences(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const parameters = <IDelegatedParameters>{
            parameters: {
                test_parameters: 'p',
            },
            iteration: {
                index: 0,
                value: 'value',
            },
        };

        context.cwd = '/cwd';
        context.ctx = {
            test_ctx: 'c',
        };

        context.secrets = {
            test_secrets: 's',
        };

        process.env.TEST = 'yes';

        const result = ContextUtil.resolveReferences(
            {
                ctx: '$ref:ctx.test_ctx',
                secrets: '$ref:secrets.test_secrets',
                parameters: '$ref:parameters.test_parameters',
                iteration: '$ref:iteration ',
                env: '$ref:env.TEST',
                cwd: ' $ref:cwd',
                array: [
                    {
                        arr1: '$ref:ctx.test_ctx',
                    },
                ],
            },
            context,
            parameters,
        );

        assert.deepStrictEqual(result, {
            cwd: '/cwd',
            ctx: 'c',
            secrets: 's',
            parameters: 'p',
            env: 'yes',
            iteration: {
                index: 0,
                value: 'value',
            },
            array: [
                {
                    arr1: 'c',
                },
            ],
        });

        // check missing
        const missing: any = null;
        assert.strictEqual(ContextUtil.resolveReferences(missing, context, parameters), null);

        // check errors
        chai.expect(() => {
            ContextUtil.resolveReferences(
                {
                    test: '$ref:ctx.test_ctx_missing',
                },
                context,
                parameters,
            );
        }).to.throw(
            'Unable to find reference match for "$.ctx.test_ctx_missing". Missing value found upon traveling the path at "test_ctx_missing".',
        );

        // check errors
        chai.expect(() => {
            ContextUtil.resolveReferences(
                {
                    test: '$ref:ctx.test_ctx.missing',
                },
                context,
                parameters,
            );
        }).to.throw(
            'Unable to find reference match for "$.ctx.test_ctx.missing". Non-object value found upon traveling the path at "missing".',
        );
    }
}
