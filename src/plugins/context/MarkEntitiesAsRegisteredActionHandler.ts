import { ActionSnapshot, ActionHandler, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import { BaseMarkEntityAsActionProcessor } from './BaseMarkEntityAsActionProcessor';

export class MarkEntitiesAsRegisteredActionProcessor extends BaseMarkEntityAsActionProcessor {
    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        this.context.entities.registered.push(...this.options);
        this.snapshot.setContext(this.context);
    }
}

export class MarkEntitiesAsRegisteredActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.context.entities.registered',
        aliases: ['fbl.context.entities.registered', 'context.entities.registered', 'entities.registered'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsRegisteredActionHandler.metadata;
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
        return new MarkEntitiesAsRegisteredActionProcessor(options, context, snapshot, parameters);
    }
}
