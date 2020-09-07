import {
    ActionProcessor,
    ActionSnapshot,
    IDelegatedParameters,
    IActionHandlerMetadata,
    ActionHandler,
} from '../../../src';
import { DummyActionProcessor } from './DummyActionProcessor';

import { v4 as uuidv4 } from 'uuid';

export class DummyActionHandler extends ActionHandler {
    public shouldSkipExecution = false;
    public executeFn: Function;
    public validateFn: Function;

    public id: string;

    constructor() {
        super();
        this.id = uuidv4();
    }

    getMetadata(): IActionHandlerMetadata {
        return <IActionHandlerMetadata>{
            id: this.id,
        };
    }

    getProcessor(
        options: any,
        context: any,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        const processor = new DummyActionProcessor(options, context, snapshot, parameters);
        processor.executeFn = this.executeFn;
        processor.validateFn = this.validateFn;
        processor.shouldSkipExecution = this.shouldSkipExecution;

        return processor;
    }
}
