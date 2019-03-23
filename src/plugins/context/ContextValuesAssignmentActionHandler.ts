import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { BaseValuesAssignmentActionProcessor } from './BaseValuesAssignmentActionProcessor';
import { ActionSnapshot, ActionHandler, ActionProcessor } from '../../models';

export class ContextValuesAssignmentActionProcessor extends BaseValuesAssignmentActionProcessor {
    /**
     * @inheritdoc
     */
    getAssignmentKey(): 'ctx' | 'secrets' {
        return 'ctx';
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        await super.execute();
        this.snapshot.setContext(this.context);
    }
}

export class ContextValuesAssignmentActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.context.ctx',
        aliases: ['fbl.context.ctx', 'context.ctx', 'ctx'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return ContextValuesAssignmentActionHandler.metadata;
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
        return new ContextValuesAssignmentActionProcessor(options, context, snapshot, parameters);
    }
}
