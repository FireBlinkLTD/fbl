import {ActionHandler, ActionSnapshot, IHandlerMetadata} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FlowService} from '../../services';
import {IContext} from '../../interfaces';

export class ParallelFlowHandler extends ActionHandler {
    private static metadata = <IHandlerMetadata> {
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

    getMetadata(): IHandlerMetadata {
        return ParallelFlowHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return ParallelFlowHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);
        const promises = options.map(async (action: any): Promise<void> => {
            const keys = Object.keys(action);
            const idOrAlias = keys[0];
            const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, action[idOrAlias], context);
            snapshot.registerChildActionSnapshot(childSnapshot);
        });

        await Promise.all(promises);
    }
}
