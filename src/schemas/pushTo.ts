import * as Joi from 'joi';
import {FBL_ASSIGN_TO_SCHEMA} from './assignTo';

const FBL_PUSH_TO_SCHEMA = FBL_ASSIGN_TO_SCHEMA.keys({
    children: Joi.boolean()
});

export {FBL_PUSH_TO_SCHEMA};
