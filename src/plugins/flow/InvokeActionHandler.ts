import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { FBL_ACTION_SCHEMA } from '../../schemas';
import * as Joi from 'joi';
import { FlowService } from '../../services';

export class InvokeActionProcessor extends ActionProcessor {
    private static validationSchema = FBL_ACTION_SCHEMA;

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return InvokeActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const childSnapshot = await FlowService.instance.executeAction(
            this.snapshot.source,
            this.snapshot.wd,
            this.options,
            this.context,
            this.parameters,
            this.snapshot,
        );
        this.snapshot.registerChildActionSnapshot(childSnapshot);
    }
}

export class InvokeActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.invoke',
        aliases: ['fbl.flow.invoke', 'flow.invoke', 'invoke'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return InvokeActionHandler.metadata;
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
        return new InvokeActionProcessor(options, context, snapshot, parameters);
    }
}
