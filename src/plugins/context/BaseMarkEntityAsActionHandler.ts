import {ActionHandler} from '../../models';
import * as Joi from 'joi';

export abstract class BaseMarkEntityAsActionHandler extends ActionHandler {
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

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return BaseMarkEntityAsActionHandler.validationSchema;
    }
}
