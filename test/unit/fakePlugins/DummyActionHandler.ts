import {
    ActionProcessor,
    ActionSnapshot,
    IDelegatedParameters,
    IActionHandlerMetadata,
    ActionHandler,
} from '../../../src';
import { DummyActionProcessor } from './DummyActionProcessor';

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;

        return v.toString(16);
    });
};

export class DummyActionHandler extends ActionHandler {
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

        return processor;
    }
}
