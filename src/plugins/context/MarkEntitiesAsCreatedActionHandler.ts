import { ActionHandler, ActionProcessor, ActionSnapshot } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { BaseMarkEntityAsActionProcessor } from './BaseMarkEntityAsActionProcessor';

export class MarkEntitiesAsCreatedActionProcessor extends BaseMarkEntityAsActionProcessor {
    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        this.context.entities.created.push(...this.options);
        this.context.entities.registered.push(...this.options);
        this.snapshot.setContext(this.context);
    }
}

export class MarkEntitiesAsCreatedActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.context.entities.created',
        aliases: ['fbl.context.entities.created', 'context.entities.created', 'entities.created'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsCreatedActionHandler.metadata;
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
        return new MarkEntitiesAsCreatedActionProcessor(options, context, snapshot, parameters);
    }
}
