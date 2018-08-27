import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {BaseMarkEntityAs} from './BaseMarkEntityAs';

const version = require('../../../../package.json').version;

export class MarkEntitiesAsRegistered extends BaseMarkEntityAs {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.entities.registered',
        version: version,
        aliases: [
            'fbl.context.entities.registered',
            'context.entities.registered',
            'ctx.entities.registered'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return MarkEntitiesAsRegistered.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        context.entities.registered.push(...options);
        snapshot.setContext(context);
    }
}
