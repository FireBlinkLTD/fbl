import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {BaseValuesAssignmentActionHandler} from './BaseValuesAssignmentActionHandler';
import {ActionSnapshot} from '../../models';

export class ContextValuesAssignmentActionHandler extends BaseValuesAssignmentActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.ctx',
        aliases: [
            'fbl.context.ctx',
            'context.ctx',
            'ctx',
        ]
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
    getAssignmentKey(): 'ctx' | 'secrets' {
        return 'ctx';
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await super.execute(options, context, snapshot, parameters);
        snapshot.setContext(context);
    }
}
