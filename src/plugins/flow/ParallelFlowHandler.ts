import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {IActionHandlerMetadata, IContext} from '../../interfaces';

const version = require('../../../../package.json').version;

export class ParallelFlowHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.parallel',
        version: version,
        aliases: [
            'fbl.flow.parallel',
            'flow.parallel',
            'parallel',
            'async',
            '||'
        ],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true
    };

    private static validationSchema = Joi.array()
        .items(FBLService.STEP_SCHEMA)
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
