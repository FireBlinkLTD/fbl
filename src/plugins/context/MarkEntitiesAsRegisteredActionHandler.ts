import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {BaseMarkEntityAsActionHandler} from './BaseMarkEntityAsActionHandler';

export class MarkEntitiesAsRegisteredActionHandler extends BaseMarkEntityAsActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.entities.registered',
        aliases: [
            'fbl.context.entities.registered',
            'context.entities.registered',
            'entities.registered'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsRegisteredActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        context.entities.registered.push(...options);
        snapshot.setContext(context);
    }
}
