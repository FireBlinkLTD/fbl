import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {BaseMarkEntityAsActionHandler} from './BaseMarkEntityAsActionHandler';

const version = require('../../../../package.json').version;

export class MarkEntitiesAsUpdatedActionHandler extends BaseMarkEntityAsActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.entities.updated',
        version: version,
        aliases: [
            'fbl.context.entities.updated',
            'context.entities.updated',
            'entities.updated'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsUpdatedActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        context.entities.updated.push(...options);
        context.entities.registered.push(...options);
        snapshot.setContext(context);
    }
}
