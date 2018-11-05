import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {BaseMarkEntityAsActionHandler} from './BaseMarkEntityAsActionHandler';

const version = require('../../../../package.json').version;

export class MarkEntitiesAsDeletedActionHandler extends BaseMarkEntityAsActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.entities.deleted',
        version: version,
        aliases: [
            'fbl.context.entities.deleted',
            'context.entities.deleted',
            'entities.deleted'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsDeletedActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        context.entities.deleted.push(...options);
        context.entities.unregistered.push(...options);
        snapshot.setContext(context);
    }
}
