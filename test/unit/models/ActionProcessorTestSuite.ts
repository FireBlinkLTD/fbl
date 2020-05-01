import { test, suite } from 'mocha-typescript';
import { ActionSnapshot, IDelegatedParameters, ContextUtil, ActionProcessor } from '../../../src';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

class DummyActionProcessor extends ActionProcessor {
    async execute(): Promise<void> {
        // tslint:disable-next-line
    }
}

@suite()
export class ActionProcessorTestSuite {
    @test()
    async testNoValidation(): Promise<void> {
        const options = 'test';
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', '.', {}, '', 0, {});
        const parameters = <IDelegatedParameters>{
            parameters: {
                test: 'yes',
            },
        };

        const processor = new DummyActionProcessor(options, context, snapshot, parameters);

        await processor.validate();
        await processor.execute();
    }
}
