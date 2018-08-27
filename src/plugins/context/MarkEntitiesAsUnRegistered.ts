import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {BaseMarkEntityAs} from './BaseMarkEntityAs';

const version = require('../../../../package.json').version;

export class MarkEntitiesAsUnRegistered extends BaseMarkEntityAs {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.entities.unregistered',
        version: version,
        aliases: [
            'fbl.context.entities.unregistered',
            'context.entities.unregistered',
            'ctx.entities.unregistered'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsUnRegistered.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        context.entities.unregistered.push(...options);
        snapshot.setContext(context);
    }
}
