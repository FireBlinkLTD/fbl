import * as Joi from 'joi';
import {IContext} from '../interfaces';
import {ActionSnapshot} from './ActionSnapshot';

/**
 * Context variables resolver
 */
export abstract class ActionHandler {
    /**
     * Get handler metadata
     * @returns {IHandlerMetadata}
     */
    abstract getMetadata(): IHandlerMetadata;

    /**
     * Validate options before processing.
     * Should throw exception on error.
     * @param options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @returns {Promise<void>}
     */
    async validate(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const schema = this.getValidationSchema();
        if (schema) {
            const result = Joi.validate(options, schema);
            if (result.error) {
                throw new Error(this.getMetadata().id + ': ' + result.error.details.map(d => d.message).join('\n'));
            }
        }
    }

    /**
     * Get Joi schema to validate options with
     */
    protected getValidationSchema(): Joi.SchemaLike | null {
        return null;
    }

    /**
     * Check if handler should be actually executed
     * @param options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @returns {Promise<boolean>}
     */
    async isShouldExecute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<boolean> {
        return true;
    }

    /**
     * Execute handler
     * @param options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @returns {Promise<void>}
     */
    abstract async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void>;
}

export interface IHandlerMetadata {
    id: string;
    description?: string;
    examples?: string[];
    aliases?: string[];
    version: string;
    skipTemplateProcessing?: boolean;
}
