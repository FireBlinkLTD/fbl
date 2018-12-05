import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import { ContextUtil } from '../../utils';
import Container from 'typedi';
import { TemplateUtilitiesRegistry } from '../../services';

export class FunctionActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.function',
        aliases: [
            'fbl.function',
            'function',
            'function()',
            'fn',
            'fn()',
        ]
    };

    private static validationSchema = Joi.string().min(1)
        .required()
        .options({ abortEarly: true });

    private static entityValidationSchema = Joi.object()
        .keys({
            type: Joi.string().required().min(1),
            id: Joi.alternatives(Joi.string().min(1), Joi.number()).required(),
            payload: Joi.any()
        })
        .options({
            abortEarly: true,
            allowUnknown: false
        });

    private static functionResultValidationSchema = Joi.object()
        .keys({
            cwd: Joi.string().min(1),
            ctx: Joi.object(),
            secrets: Joi.object(),
            entities: Joi.object()
                .keys({
                    registered: Joi.array().items(FunctionActionHandler.entityValidationSchema),
                    unregistered: Joi.array().items(FunctionActionHandler.entityValidationSchema),
                    created: Joi.array().items(FunctionActionHandler.entityValidationSchema),
                    updated: Joi.array().items(FunctionActionHandler.entityValidationSchema),
                    deleted: Joi.array().items(FunctionActionHandler.entityValidationSchema)
                })
                .options({
                    allowUnknown: false
                }),
            parameters: Joi.any(),
            iteration: Joi.object()
                .keys({
                    index: Joi.number().min(0).required(),
                    value: Joi.any(),
                    key: Joi.string()        
                })
        });

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return FunctionActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return FunctionActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const script = [
            'return async function($, env, require, cwd, ctx, secrets, entities, parameters, iteration) {',
            options,
            '}'
        ].join('\n');

        const fn = (new Function(script))();
        
        const result = await fn(
            Container.get(TemplateUtilitiesRegistry).generateUtilities(context, snapshot, parameters),
            process.env,
            require,     
            context.cwd,
            context.ctx,
            context.secrets,
            context.entities,
            parameters.parameters, 
            parameters.iteration
        );

        if (result) {
            const validationResult = Joi.validate(result, FunctionActionHandler.functionResultValidationSchema);
            if (validationResult.error) {
                throw new Error(validationResult.error.details.map(d => d.message).join('\n'));
            }

            ['cwd', 'ctx', 'secrets', 'entities']
                .forEach((field: 'cwd' | 'ctx' | 'secrets' | 'entities') => {
                    /* istanbul ignore else */
                    if (!ContextUtil.isMissing(result[field])) {
                        context[field] = result[field];
                    }
                });
            snapshot.setContext(context);
            
            ['parameters', 'iteration']
                .forEach((field: 'parameters' | 'iteration') => {
                    /* istanbul ignore else */
                    if (!ContextUtil.isMissing(result[field])) {
                        parameters[field] = result[field];
                    }
                });                                                
        }
    }
}
