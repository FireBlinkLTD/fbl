import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';

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

    getMetadata(): IActionHandlerMetadata {
        return FunctionActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return FunctionActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const script = [
            'return async function(require, cwd, ctx, secrets, entities, parameters, iteration) {',
            options,
            '}'
        ].join('\n');

        const fn = (new Function(script))();
        await fn(
            require,     
            context.cwd,
            context.ctx,
            context.secrets,
            context.entities,
            parameters.parameters, 
            parameters.iteration
        );
    }
}
