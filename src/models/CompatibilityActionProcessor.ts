import * as Joi from 'joi';

import { ActionProcessor } from './ActionProcessor';
import { ActionHandler } from './ActionHandler';

export class CompatibilityActionProcessor extends ActionProcessor {
    public actionHandler!: ActionHandler;

    async validate(): Promise<void> {
        await this.actionHandler.validate(this.options, this.context, this.snapshot, this.parameters);
    }

    async isShouldExecute(): Promise<boolean> {
        return await this.actionHandler.isShouldExecute(this.options, this.context, this.snapshot, this.parameters);
    }

    async execute(): Promise<void> {
        return await this.actionHandler.execute(this.options, this.context, this.snapshot, this.parameters);
    }
}
