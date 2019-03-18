import {test, suite} from 'mocha-typescript';
import {ActionSnapshot} from '../../../../src/models';
import {MarkEntitiesAsUpdatedActionHandler} from '../../../../src/plugins/context/MarkEntitiesAsUpdatedActionHandler';
import {IContextEntity} from '../../../../src/interfaces';
import * as assert from 'assert';
import {ContextUtil} from '../../../../src/utils';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite
class MarkEntitiesAsUpdatedActionHandlerTestSuite {

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new MarkEntitiesAsUpdatedActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.getProcessor({}, context, snapshot, {}).validate()
        ).to.be.rejected;

        await chai.expect(
            actionHandler.getProcessor(1, context, snapshot, {}).validate()
        ).to.be.rejected;

        await chai.expect(
            actionHandler.getProcessor('test', context, snapshot, {}).validate()
        ).to.be.rejected;

        await chai.expect(
            actionHandler.getProcessor(true, context, snapshot, {}).validate()
        ).to.be.rejected;

        await chai.expect(
            actionHandler.getProcessor([], context, snapshot, {}).validate()
        ).to.be.rejected;
        
        await chai.expect(
            actionHandler.getProcessor([{}], context, snapshot, {}).validate()
        ).to.be.rejected;

        await chai.expect(
            actionHandler.getProcessor([{
                type: 'test'
            }], context, snapshot, {}).validate()
        ).to.be.rejected;

        await chai.expect(
            actionHandler.getProcessor([{
                id: 'test'
            }], context, snapshot, {}).validate()
        ).to.be.rejected;

        await chai.expect(
            actionHandler.getProcessor([{
                type: false,
                id: 'test'
            }], context, snapshot, {}).validate()
        ).to.be.rejected;

        await chai.expect(
            actionHandler.getProcessor([{
                type: 'test',
                id: true
            }], context, snapshot, {}).validate()
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new MarkEntitiesAsUpdatedActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.getProcessor([{
            type: 'test',
            id: 1
        }], context, snapshot, {}).validate();        
    }

    @test()
    async execution(): Promise<void> {
        const actionHandler = new MarkEntitiesAsUpdatedActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const options = [
            <IContextEntity> {
                type: 't1',
                id: 1,
                payload: false
            },

            <IContextEntity> {
                type: 't2',
                id: 'e2',
                payload: [{test: 'yes'}]
            }
        ];

        await actionHandler.getProcessor(options, context, snapshot, {}).execute();
        assert.deepStrictEqual(context.entities.registered, options);
        assert.deepStrictEqual(context.entities.updated, options);
    }
}
