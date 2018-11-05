import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {BaseValuesAssignmentActionHandler} from './BaseValuesAssignmentActionHandler';
import {ActionSnapshot} from '../../models';

const version = require('../../../../package.json').version;

export class ContextValuesAssignmentActionHandler extends BaseValuesAssignmentActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.ctx',
        version: version,
        aliases: [
            'fbl.context.ctx',
            'context.ctx',
            'ctx',
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return ContextValuesAssignmentActionHandler.metadata;
    }

    getAssignmentKey(): 'ctx' | 'secrets' {
        return 'ctx';
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await super.execute(options, context, snapshot, parameters);
        snapshot.setContext(context);
    }
}
