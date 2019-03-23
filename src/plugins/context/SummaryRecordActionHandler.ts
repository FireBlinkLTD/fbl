import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters, ISummaryRecord } from '../../interfaces';
import * as Joi from 'joi';

export class SummaryRecordActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object({
        title: Joi.string()
            .min(1)
            .required(),
        status: Joi.string()
            .min(1)
            .required(),
        duration: Joi.string().min(1),
        payload: Joi.any(),
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return SummaryRecordActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        this.context.summary.push(<ISummaryRecord>this.options);
        this.snapshot.setContext(this.context);
    }
}

export class SummaryRecordActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.context.summary',
        aliases: ['fbl.context.summary', 'context.summary', 'summary'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return SummaryRecordActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getProcessor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        return new SummaryRecordActionProcessor(options, context, snapshot, parameters);
    }
}
