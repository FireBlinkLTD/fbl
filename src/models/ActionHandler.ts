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
    /**
     * Action ID
     */
    id: string;

    /**
     * Human readable description
     */
    description?: string;

    /**
     * Optional YAML string formatted examples
     */
    examples?: string[];

    /**
     * Aliases that can be used to reference action handler instead of using long ID
     */
    aliases?: string[];

    /**
     * Version of action handler
     */
    version: string;

    /**
     * If provided options will not be treated as EJS template and as a result won't be resolved
     */
    skipTemplateProcessing?: boolean;

    /**
     * If provided entire options object will be considered as a sensitive information and will be masked in report.
     */
    considerOptionsAsSecrets?: boolean;
}
