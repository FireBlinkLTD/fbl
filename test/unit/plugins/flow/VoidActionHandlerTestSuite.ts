import { test, suite } from 'mocha-typescript';
import { ActionHandler, ActionSnapshot } from '../../../../src/models';
import { Container } from 'typedi';
import { FlowService } from '../../../../src/services';
import { VirtualFlowActionHandler } from '../../../../src/plugins/flow/VirtualFlowActionHandler';
import { SequenceFlowActionHandler } from '../../../../src/plugins/flow/SequenceFlowActionHandler';
import { IActionHandlerMetadata, IPlugin } from '../../../../src/interfaces';
import * as assert from 'assert';
import { ContextUtil } from '../../../../src/utils';
import { FSTemplateUtility } from '../../../../src/plugins/templateUtilities/FSTemplateUtility';
import { VoidFlowActionHandler } from '../../../../src/plugins/flow/VoidFlowActionHandler';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class VoidActionHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new VoidFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;
        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;
        await chai.expect(actionHandler.getProcessor(0, context, snapshot, {}).validate()).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new VoidFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        actionHandler.getProcessor(undefined, context, snapshot, {}).validate();
    }

    @test()
    async execute(): Promise<void> {
        const actionHandler = new VoidFlowActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.getProcessor(undefined, context, snapshot, {}).execute();
    }
}
