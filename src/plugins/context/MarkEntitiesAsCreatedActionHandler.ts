import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {BaseMarkEntityAsActionHandler} from './BaseMarkEntityAsActionHandler';

export class MarkEntitiesAsCreatedActionHandler extends BaseMarkEntityAsActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.entities.created',
        aliases: [
            'fbl.context.entities.created',
            'context.entities.created',
            'entities.created'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsCreatedActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        context.entities.created.push(...options);
        context.entities.registered.push(...options);
        snapshot.setContext(context);
    }
}
