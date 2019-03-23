import { ActionSnapshot, ActionHandler, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { BaseMarkEntityAsActionProcessor } from './BaseMarkEntityAsActionProcessor';

export class MarkEntitiesAsUnRegisteredActionProcessor extends BaseMarkEntityAsActionProcessor {
    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        this.context.entities.unregistered.push(...this.options);
        this.snapshot.setContext(this.context);
    }
}

export class MarkEntitiesAsUnRegisteredActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.context.entities.unregistered',
        aliases: ['fbl.context.entities.unregistered', 'context.entities.unregistered', 'entities.unregistered'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsUnRegisteredActionHandler.metadata;
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
        return new MarkEntitiesAsUnRegisteredActionProcessor(options, context, snapshot, parameters);
    }
}
