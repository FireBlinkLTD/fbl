import * as Joi from '@hapi/joi';

const FBL_ASSIGN_TO_OBJECT_SCHEMA = Joi.object({
    ctx: Joi.string()
        .regex(/^\$\.[^.]+(\.[^.]+)*$/)
        .min(1),
    secrets: Joi.string()
        .regex(/^\$\.[^.]+(\.[^.]+)*$/)
        .min(1),
    parameters: Joi.string()
        .regex(/^\$\.[^.]+(\.[^.]+)*$/)
        .min(1),
    override: Joi.boolean(),
}).or('ctx', 'secrets', 'parameters');

const FBL_ASSIGN_TO_STRING_SCHEMA = Joi.string()
    .regex(/^\$\.(ctx|secrets|parameters)\.[^.]+(\.[^.]+)*$/)
    .min(1);

const FBL_ASSIGN_TO_SCHEMA = Joi.alternatives(FBL_ASSIGN_TO_OBJECT_SCHEMA, FBL_ASSIGN_TO_STRING_SCHEMA);

export { FBL_ASSIGN_TO_OBJECT_SCHEMA, FBL_ASSIGN_TO_STRING_SCHEMA, FBL_ASSIGN_TO_SCHEMA };
