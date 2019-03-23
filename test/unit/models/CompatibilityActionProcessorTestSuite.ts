import { test, suite } from 'mocha-typescript';
import {
    ActionHandler,
    ActionSnapshot,
    IDelegatedParameters,
    IContext,
    ContextUtil,
    IActionHandlerMetadata,
} from '../../../src';
import { deepStrictEqual } from 'assert';
import * as Joi from 'joi';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

interface IMethodParameters {
    options: any;
    context: IContext;
    snapshot: ActionSnapshot;
    parameters: IDelegatedParameters;
}

class EmptyActionHandler extends ActionHandler {
    getMetadata(): IActionHandlerMetadata {
        return {
            id: 'empty',
        };
    }
}

class CompatibilityActionHandler extends ActionHandler {
    public validateMethodParameters?: IMethodParameters | undefined;
    public isShouldExecuteMethodParameters?: IMethodParameters | undefined;
    public executeMethodParameters?: IMethodParameters | undefined;
    public getValidationSchemaCalled = false;

    getMetadata(): IActionHandlerMetadata {
        return {
            id: 'test',
        };
    }

    async validate(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        this.validateMethodParameters = {
            options,
            context,
            snapshot,
            parameters,
        };

        await super.validate(options, context, snapshot, parameters);
    }

    public getValidationSchema(): Joi.SchemaLike | null {
        this.getValidationSchemaCalled = true;

        return null;
    }

    async isShouldExecute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<boolean> {
        this.isShouldExecuteMethodParameters = {
            options,
            context,
            snapshot,
            parameters,
        };

        return true;
    }

    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        this.executeMethodParameters = {
            options,
            context,
            snapshot,
            parameters,
        };
    }
}

@suite()
export class CompatibilityActionProcessorTestSuite {
    @test()
    async compatibilityActionProcessorCreation(): Promise<void> {
        const options = 'test';
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const parameters = <IDelegatedParameters>{
            parameters: {
                test: 'yes',
            },
        };

        const actionHandler = new CompatibilityActionHandler();
        const processor = actionHandler.getProcessor(options, context, snapshot, parameters);

        await processor.validate();
        await processor.isShouldExecute();
        await processor.execute();

        const expected: IMethodParameters = {
            options,
            context,
            snapshot,
            parameters,
        };

        deepStrictEqual(actionHandler.validateMethodParameters, expected);
        deepStrictEqual(actionHandler.isShouldExecuteMethodParameters, expected);
        deepStrictEqual(actionHandler.executeMethodParameters, expected);
    }

    @test()
    async invokeDeprecatedMethods(): Promise<void> {
        const options = 'test';
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const parameters = <IDelegatedParameters>{
            parameters: {
                test: 'yes',
            },
        };

        const actionHandler = new EmptyActionHandler();

        await actionHandler.validate(options, context, snapshot, parameters);
        await actionHandler.isShouldExecute(options, context, snapshot, parameters);
        await chai.expect(actionHandler.execute(options, context, snapshot, parameters)).to.be.rejected;
    }
}
