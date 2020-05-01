import * as Joi from '@hapi/joi';
import { FBLService } from '../services';

const joiStringActionSchemaExt = Joi.extend({
    type: 'FBLActionString',
    base: Joi.string().min(1).required(),
    messages: {
        metadata: 'Action "{{value}}" name could not start with metadata prefix.',
    },
    rules: {
        metadata: {
            validate: (value, helpers) => {
                if (value.startsWith(FBLService.METADATA_PREFIX)) {
                    return helpers.error('FBLActionString.metadata');
                }

                return value;
            },
        },
    },
});

const joiObjectActionSchemaExt = Joi.extend({
    type: 'FBLActionObject',
    base: Joi.object().min(1).required(),
    messages: {
        fields: 'Found {{nonAnnotationKeys}} non-annotation field(s), but only one is allowed.',
    },
    rules: {
        fields: {
            validate: (value, helpers) => {
                const keys = Object.keys(value);

                let nonAnnotationKeys = 0;
                for (const key of keys) {
                    if (!key.startsWith(FBLService.METADATA_PREFIX)) {
                        nonAnnotationKeys++;
                    }
                }

                if (nonAnnotationKeys !== 1) {
                    return helpers.error('FBLActionObject.fields', { nonAnnotationKeys });
                }

                return value;
            },
        },
    },
});

const FBL_ACTION_SCHEMA = Joi.alternatives(
    joiObjectActionSchemaExt.FBLActionObject().fields(),
    joiStringActionSchemaExt.FBLActionString().metadata(), // actions without options
).required();

export { FBL_ACTION_SCHEMA };
