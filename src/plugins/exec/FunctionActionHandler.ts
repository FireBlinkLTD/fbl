import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from 'joi';
import Container from 'typedi';
import { TemplateUtilitiesRegistry } from '../../services';
import { isMissing } from 'object-collider';
import { ActionError, INVALID_CONFIGURATION } from '../../errors';

export class FunctionActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.string()
        .min(1)
        .required()
        .options({ abortEarly: true });

    private static functionResultValidationSchema = Joi.object().keys({
        cwd: Joi.string().min(1),
        ctx: Joi.object(),
        secrets: Joi.object(),
        parameters: Joi.any(),
        iteration: Joi.object().keys({
            index: Joi.number()
                .min(0)
                .required(),
            value: Joi.any(),
            key: Joi.string(),
        }),
    });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return FunctionActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const script = [
            'return async function($, env, require, cwd, ctx, secrets, parameters, iteration) {',
            this.options,
            '}',
        ].join('\n');

        const fn = new Function(script)();

        const result = await fn(
            Container.get(TemplateUtilitiesRegistry).generateUtilities(
                this.context,
                this.snapshot,
                this.parameters,
                this.snapshot.wd,
            ),
            process.env,
            require,
            this.context.cwd,
            this.context.ctx,
            this.context.secrets,
            this.parameters.parameters,
            this.parameters.iteration,
        );

        if (result) {
            const validationResult = Joi.validate(result, FunctionActionProcessor.functionResultValidationSchema);
            if (validationResult.error) {
                throw new ActionError(
                    validationResult.error.details.map(d => d.message).join('\n'),
                    INVALID_CONFIGURATION,
                );
            }

            ['cwd', 'ctx', 'secrets'].forEach((field: 'cwd' | 'ctx' | 'secrets') => {
                /* istanbul ignore else */
                if (!isMissing(result[field])) {
                    this.context[field] = result[field];
                }
            });
            this.snapshot.setContext(this.context);

            ['parameters', 'iteration'].forEach((field: 'parameters' | 'iteration') => {
                /* istanbul ignore else */
                if (!isMissing(result[field])) {
                    this.parameters[field] = result[field];
                }
            });
        }
    }
}

export class FunctionActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.function',
        aliases: ['fbl.function', 'function', 'function()', 'fn', 'fn()'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return FunctionActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getProcessor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        return new FunctionActionProcessor(options, context, snapshot, parameters);
    }
}
