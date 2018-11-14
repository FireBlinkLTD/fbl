import * as Joi from 'joi';
import {FBLService} from '../services';

const joiStepSchemaExt = Joi.extend({
    name: 'FBLAction',
    base: Joi.object().min(1).required(),
    language: {
        fields: ''
    },
    rules: [
        {
            name: 'fields',
            validate (params, value, state, options) {
                const keys = Object.keys(value);

                let nonAnnotationKeys = 0;
                for (const key of keys) {
                    if (!key.startsWith(FBLService.METADATA_PREFIX)) {
                        nonAnnotationKeys++;
                    }
                }

                if (nonAnnotationKeys !== 1) {
                    return this.createError(`Found ${nonAnnotationKeys} non-annotation fields, but only one is required.`, {}, state, options);
                }

                return value;
            }
        }
    ]
});

const FBL_ACTION_SCHEMA = joiStepSchemaExt.FBLAction().fields();

export {FBL_ACTION_SCHEMA};
