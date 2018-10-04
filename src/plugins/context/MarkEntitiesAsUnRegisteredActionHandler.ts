import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {BaseMarkEntityAsActionHandler} from './BaseMarkEntityAsActionHandler';

const version = require('../../../../package.json').version;

export class MarkEntitiesAsUnRegisteredActionHandler extends BaseMarkEntityAsActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.entities.unregistered',
        version: version,
        aliases: [
            'fbl.context.entities.unregistered',
            'context.entities.unregistered',
            'entities.unregistered'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsUnRegisteredActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        context.entities.unregistered.push(...options);
        snapshot.setContext(context);
    }
}
