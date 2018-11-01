import {test, suite} from 'mocha-typescript';
import {ActionSnapshot} from '../../../../src/models';
import {IContextEntity} from '../../../../src/interfaces';
import * as assert from 'assert';
import {ContextUtil} from '../../../../src/utils';
import {ErrorActionHandler} from '../../../../src/plugins/flow/ErrorActionHandler';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite
class ErrorActionHandlerTestSuite {

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ErrorActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate({}, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(1, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ErrorActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate('message', context, snapshot)
        ).to.be.not.rejected;
    }

    @test()
    async execution(): Promise<void> {
        const actionHandler = new ErrorActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        actionHandler.validate('test', context, snapshot);
        await chai.expect(
            actionHandler.execute('test', context, snapshot),
            'test'
        ).to.be.rejected;
    }
}
