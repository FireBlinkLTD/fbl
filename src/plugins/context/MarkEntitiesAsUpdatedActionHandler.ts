import { ActionSnapshot, ActionHandler, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { BaseMarkEntityAsActionProcessor } from './BaseMarkEntityAsActionProcessor';

export class MarkEntitiesAsUpdatedActionProcessor extends BaseMarkEntityAsActionProcessor {
    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        this.context.entities.updated.push(...this.options);
        this.context.entities.registered.push(...this.options);
        this.snapshot.setContext(this.context);
    }
}

export class MarkEntitiesAsUpdatedActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.context.entities.updated',
        aliases: ['fbl.context.entities.updated', 'context.entities.updated', 'entities.updated'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsUpdatedActionHandler.metadata;
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
        return new MarkEntitiesAsUpdatedActionProcessor(options, context, snapshot, parameters);
    }
}
