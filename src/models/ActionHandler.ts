import * as Joi from '@hapi/joi';

import { IContext, IActionHandlerMetadata, IDelegatedParameters } from '../interfaces';
import { ActionSnapshot } from './ActionSnapshot';
import { ActionProcessor } from './ActionProcessor';
import { CompatibilityActionProcessor } from './CompatibilityActionProcessor';
import { INVALID_CONFIGURATION, ActionError } from '../errors';

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
     * @deprecated
     */

    async validate(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> /** istanbul ignore next  */ {
        const schema = this.getValidationSchema();
        /* istanbul ignore next */
        if (schema) {
            try {
                Joi.assert(options, schema);
            } catch (e) {
                throw new ActionError(
                    (<Joi.ValidationError>e).details.map((d) => d.message).join('\n'),
                    INVALID_CONFIGURATION,
                );
            }
        }
    }

    /**
     * Get Joi schema to validate options with
     * @deprecated
     */
    public getValidationSchema(): Joi.SchemaLike | null /** istanbul ignore next  */ {
        return null;
    }

    /**
     * Check if handler should be actually executed
     * @param options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @param {IDelegatedParameters} parameters
     * @deprecated
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
     * @deprecated
     */
    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        throw new Error('ActionHandler.execute() method is deprecated.');
    }
}
