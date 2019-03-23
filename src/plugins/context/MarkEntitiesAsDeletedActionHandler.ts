import { ActionSnapshot, ActionHandler, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { BaseMarkEntityAsActionProcessor } from './BaseMarkEntityAsActionProcessor';

export class MarkEntitiesAsDeletedActionProcessor extends BaseMarkEntityAsActionProcessor {
    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        this.context.entities.deleted.push(...this.options);
        this.context.entities.unregistered.push(...this.options);
        this.snapshot.setContext(this.context);
    }
}

export class MarkEntitiesAsDeletedActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.context.entities.deleted',
        aliases: ['fbl.context.entities.deleted', 'context.entities.deleted', 'entities.deleted'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsDeletedActionHandler.metadata;
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
        return new MarkEntitiesAsDeletedActionProcessor(options, context, snapshot, parameters);
    }
}
