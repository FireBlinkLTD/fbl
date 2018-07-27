import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {IActionHandlerMetadata, IContext} from '../../interfaces';

export class MarkedEntitiesAsRegistered extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.entities.registered',
        version: '1.0.0',
        description: 'Context values assignment. Either inline or from file for each key individually. Only top level keys are supported. Assignment directly to context is possible when "." key is provided.',
        aliases: [
            'fbl.context.entities.registered',
            'context.entities.registered',
            'ctx.entities.registered'
        ]
    };

    private static validationSchema = Joi.array()
        .items(Joi.object({
            type: Joi.string().min(1).required(),
            id: Joi.alternatives(
                Joi.string().min(1).required(),
                Joi.number().required(),
            ).required(),
            payload: Joi.any()
        }))
        .min(1)
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return MarkedEntitiesAsRegistered.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return MarkedEntitiesAsRegistered.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        context.entities.registered.push(...options);
        snapshot.setContext(context);
    }
}
