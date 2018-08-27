import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {BaseMarkEntityAs} from './BaseMarkEntityAs';

const version = require('../../../../package.json').version;

export class MarkEntitiesAsDeleted extends BaseMarkEntityAs {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.entities.deleted',
        version: version,
        aliases: [
            'fbl.context.entities.deleted',
            'context.entities.deleted',
            'ctx.entities.deleted'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsDeleted.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        context.entities.deleted.push(...options);
        context.entities.unregistered.push(...options);
        snapshot.setContext(context);
    }
}
