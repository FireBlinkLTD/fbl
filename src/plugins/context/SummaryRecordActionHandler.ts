import {ActionHandler, ActionSnapshot} from '../../models';

const version = require('../../../../package.json').version;

import * as Joi from 'joi';
import {IActionHandlerMetadata, IContext, ISummaryRecord} from '../../interfaces';

export class SummaryRecordActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.summary',
        version: version,
        aliases: [
            'fbl.context.summary',
            'context.summary',
            'summary'
        ]
    };

    private static validationSchema = Joi.object({
            title: Joi.string().min(1).required(),
            status: Joi.string().min(1).required(),
            duration: Joi.string().min(1),
            payload: Joi.any()
        })
        .required()
        .options({ abortEarly: true });

    getValidationSchema(): Joi.SchemaLike | null {
        return SummaryRecordActionHandler.validationSchema;
    }

    getMetadata(): IActionHandlerMetadata {
        return SummaryRecordActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        context.summary.push(<ISummaryRecord> options);
        snapshot.setContext(context);
    }
}
