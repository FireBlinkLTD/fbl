import * as Joi from 'joi';
import {ActionHandler, ActionSnapshot} from '../../models';
import {FBLService, FlowService} from '../../services';
import {Container} from 'typedi';
import {IActionHandlerMetadata, IContext} from '../../interfaces';

const version = require('../../../../package.json').version;

export class RepeatFlowHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.repeat',
        version: version,
        aliases: [
            'fbl.flow.repeat',
            'flow.repeat',
            'repeat'
        ],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true
    };

    private static validationSchema =
        Joi.object({
            times: Joi.number().min(1).required(),
            action: FBLService.STEP_SCHEMA,
            async: Joi.boolean()
        })
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return RepeatFlowHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return RepeatFlowHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        const promises: Promise<void>[] = [];
        const snapshots: ActionSnapshot[] = [];

        const keys = Object.keys(options.action);
        const idOrAlias = keys[0];

        for (let i = 0; i < options.times; i++) {
            if (options.async) {
                promises.push((async (index): Promise<void> => {
                    snapshots[index] = await flowService.executeAction(snapshot.wd, idOrAlias, options.action[idOrAlias], context, index);
                })(i));
            } else {
                snapshots[i] = await flowService.executeAction(snapshot.wd, idOrAlias, options.action[idOrAlias], context, i);
            }
        }

        await Promise.all(promises);

        // register snapshots in the order of their presence
        snapshots.forEach(childSnapshot => {
            snapshot.registerChildActionSnapshot(childSnapshot);
        });
    }
}
