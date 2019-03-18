import * as Joi from 'joi';

import { IContext, IActionHandlerMetadata, IDelegatedParameters } from '../interfaces';
import { ActionSnapshot } from './ActionSnapshot';
import { ActionProcessor } from './ActionProcessor';
import { CompatibilityActionProcessor } from './CompatibilityActionProcessor';

/**
 * Context variables resolver
 */
export abstract class ActionHandler {
    /**
     * Get handler metadata
     * @returns {IActionHandlerMetadata}
     */
    abstract getMetadata(): IActionHandlerMetadata;

    /**
     * Get working directory
     * @returns {string} with alternative wd to use
     * @returns {null} when original working directory should be used
     */
    getWorkingDirectory(): string | null {
        return null;
    }

    /**
     * Get action processor (should create new instance upon call)
     * @return {ActionProcessor}
     */
    getProcessor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        const compatibilityProcessor = new CompatibilityActionProcessor(options, context, snapshot, parameters);
        compatibilityProcessor.actionHandler = this;

        return compatibilityProcessor;
    }

    /**
     * Validate options before processing.
     * Should throw exception on error.
     * @param options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @param parameters
     * @returns {Promise<void>}
     * Get action processor (should create new instance upon call)
     * @return {ActionProcessor}
     * @deprecated
     */
    async validate(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        const schema = this.getValidationSchema();
        if (schema) {
            const result = Joi.validate(options, schema);
            if (result.error) {
                throw new Error(result.error.details.map(d => d.message).join('\n'));
            }
        }
    }

    /**
     * Get Joi schema to validate options with
     * @deprecated
     */
    public getValidationSchema(): Joi.SchemaLike | null {
        return null;
    }

    /**
     * Check if handler should be actually executed
     * @param options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @param {IDelegatedParameters} parameters
     * @returns {Promise<boolean>}
     */
    async isShouldExecute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<boolean> {
        return true;
    }

    /**
     * Execute handler
     * @param options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @param {IDelegatedParameters} parameters
     * @returns {Promise<void>}
     * @deprecated
     */
    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        throw new Error('ActionHandler.execute(...) method is deprecated.');
    }
}
