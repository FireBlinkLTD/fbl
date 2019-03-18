import { ActionProcessor } from '../../../src';

export class DummyActionProcessor extends ActionProcessor {
    public executeFn: Function;
    public validateFn: Function;

    async validate(): Promise<void> {
        if (this.validateFn) {
            await this.validateFn(this.options, this.context, this.snapshot, this.parameters);
        }
    }

    async execute(): Promise<void> {
        if (this.executeFn) {
            await this.executeFn(this.options, this.context, this.snapshot, this.parameters);
        }
    }
}
