import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {IActionHandlerMetadata, IContext} from '../../interfaces';

const version = require('../../../../package.json').version;

export abstract class BaseMarkEntityAs extends ActionHandler {
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

    getValidationSchema(): Joi.SchemaLike | null {
        return BaseMarkEntityAs.validationSchema;
    }
}
