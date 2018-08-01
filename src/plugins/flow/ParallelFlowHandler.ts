import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FlowService} from '../../services';
import {IActionHandlerMetadata, IContext} from '../../interfaces';

export class ParallelFlowHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.parallel',
        version: '1.0.0',
        description: 'Parallel flow handler. Allows to run multiple subflows in parallel.',
        aliases: [
            'fbl.parallel',
            'parallel',
            'async',
            '||'
        ],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true
    };

    private static validationSchema = Joi.array()
        .items(Joi.object().min(1).max(1))
        .min(1)
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return ParallelFlowHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return ParallelFlowHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        const snapshots: ActionSnapshot[] = [];
        const promises = options.map(async (action: any, index: number): Promise<void> => {
            const keys = Object.keys(action);
            const idOrAlias = keys[0];
            snapshots[index] = await flowService.executeAction(snapshot.wd, idOrAlias, action[idOrAlias], context, index);
        });

        await Promise.all(promises);

        // register snapshots in the order of their presence
        snapshots.forEach(childSnapshot => {
            snapshot.registerChildActionSnapshot(childSnapshot);
        });
    }
}
