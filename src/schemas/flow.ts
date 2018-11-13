import * as Joi from 'joi';
import {FBL_ACTION_SCHEMA} from './action';

const FBL_FLOW_SCHEMA = Joi.object({
    version: Joi.string()
        .regex(/\d+(\.\d+)*/i),

    requires: Joi.object({
        fbl: Joi.string().min(1),
        plugins: Joi.object().min(1).pattern(
            /^.*$/,
            Joi.string().min(1)
        ),
        applications: Joi.array().items(Joi.string().min(1)).min(1)
    }),

    description: Joi.string(),

    pipeline: FBL_ACTION_SCHEMA
}).options({ abortEarly: true });

export {FBL_FLOW_SCHEMA};
