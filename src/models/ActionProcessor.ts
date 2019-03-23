import * as Joi from 'joi';
import { IContext } from '../interfaces';
import { ActionSnapshot } from './ActionSnapshot';
import { IDelegatedParameters } from '../interfaces/IDelegatedParameters';

export abstract class ActionProcessor {
    constructor(
        protected options: any,
        protected context: IContext,
        protected snapshot: ActionSnapshot,
        protected parameters: IDelegatedParameters,
    ) {}

    /**
     * Validate options before processing.
     * Should throw exception on error.
     */
    async validate(): Promise<void> {
        const schema = this.getValidationSchema();
        if (schema) {
            const result = Joi.validate(this.options, schema);
            if (result.error) {
                throw new Error(result.error.details.map(d => d.message).join('\n'));
            }
        }
    }

    /**
     * Get Joi schema to validate options with
     * Return null if no validation should be applied, though it is not recommended.
     */
    protected getValidationSchema(): Joi.SchemaLike | null {
        return null;
    }

    /**
     * Check if action should be actually executed
     */
    async isShouldExecute(): Promise<boolean> {
        return true;
    }

    /**
     * Execute action
     */
    abstract async execute(): Promise<void>;
}
