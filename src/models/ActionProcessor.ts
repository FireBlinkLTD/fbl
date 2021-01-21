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
            try {
                Joi.assert(this.options, schema);
            } catch (e) {
                throw new Error((<Joi.ValidationError>e).details.map((d) => d.message).join('\n'));
            }
        }
    }

    /**
     * Get Joi schema to validate options with
     * Return null if no validation should be applied, though it is not recommended.
     */
    protected getValidationSchema(): Joi.Schema | null {
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
    abstract execute(): Promise<void>;
}
