import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {BaseMarkEntityAsActionHandler} from './BaseMarkEntityAsActionHandler';

export class MarkEntitiesAsUnRegisteredActionHandler extends BaseMarkEntityAsActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.entities.unregistered',
        aliases: [
            'fbl.context.entities.unregistered',
            'context.entities.unregistered',
            'entities.unregistered'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsUnRegisteredActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        context.entities.unregistered.push(...options);
        snapshot.setContext(context);
    }
}
