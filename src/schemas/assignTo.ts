import * as Joi from 'joi';

const FBL_ASSIGN_TO_SCHEMA = Joi.object({
    ctx: Joi.string()
        .regex(/^\$\.[^.]+(\.[^.]+)*$/)
        .min(1),
    secrets: Joi.string()
        .regex(/^\$\.[^.]+(\.[^.]+)*$/)
        .min(1),
    parameters: Joi.string()
        .regex(/^\$\.[^.]+(\.[^.]+)*$/)
        .min(1),
}).or('ctx', 'secrets', 'parameters');

export {FBL_ASSIGN_TO_SCHEMA};
