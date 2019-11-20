import * as Joi from 'joi';
import { FBLService } from '../services';

const joiStringActionSchemaExt = Joi.extend({
    name: 'FBLActionString',
    base: Joi.string()
        .min(1)
        .required(),
    language: {
        metadata: 'Action "{{value}}" name could not start with metadata prefix.',
    },
    rules: [
        {
            name: 'metadata',
            validate(params, value, state, options) {
                if (value.startsWith(FBLService.METADATA_PREFIX)) {
                    return this.createError('FBLActionString.metadata', { value }, state, options);
                }

                return value;
            },
        },
    ],
});

const joiObjectActionSchemaExt = Joi.extend({
    name: 'FBLActionObject',
    base: Joi.object()
        .min(1)
        .required(),
    language: {
        fields: 'Found {{nonAnnotationKeys}} non-annotation field(s), but only one is allowed.',
    },
    rules: [
        {
            name: 'fields',
            validate(params, value, state, options) {
                const keys = Object.keys(value);

                let nonAnnotationKeys = 0;
                for (const key of keys) {
                    if (!key.startsWith(FBLService.METADATA_PREFIX)) {
                        nonAnnotationKeys++;
                    }
                }

                if (nonAnnotationKeys !== 1) {
                    return this.createError('FBLActionObject.fields', { nonAnnotationKeys }, state, options);
                }

                return value;
            },
        },
    ],
});

const FBL_ACTION_SCHEMA = Joi.alternatives(
    joiObjectActionSchemaExt.FBLActionObject().fields(),
    joiStringActionSchemaExt.FBLActionString().metadata(), // actions without options
).required();

export { FBL_ACTION_SCHEMA };
