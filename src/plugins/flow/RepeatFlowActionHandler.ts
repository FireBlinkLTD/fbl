import * as Joi from 'joi';
import {ActionHandler, ActionSnapshot} from '../../models';
import {FBLService, FlowService} from '../../services';
import {Container} from 'typedi';
import {IActionHandlerMetadata, IContext, IDelegatedParameters, IIteration} from '../../interfaces';

const version = require('../../../../package.json').version;

export class RepeatFlowActionHandler extends ActionHandler {
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
        return RepeatFlowActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return RepeatFlowActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        const promises: Promise<void>[] = [];
        const snapshots: ActionSnapshot[] = [];

        const idOrAlias = FBLService.extractIdOrAlias(options.action);

        for (let i = 0; i < options.times; i++) {
            const iterationParams = JSON.parse(JSON.stringify(parameters));
            iterationParams.iteration = <IIteration> {
                index: i
            };

            let metadata = FBLService.extractMetadata(options.action);
            metadata = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false, iterationParams);

            if (options.async) {
                promises.push((async (p, m): Promise<void> => {
                    snapshots[p.iteration.index] = await flowService.executeAction(snapshot.wd, idOrAlias, m, options.action[idOrAlias], context, p);
                })(iterationParams, metadata));
            } else {

                snapshots[i] = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, options.action[idOrAlias], context, iterationParams);
            }
        }

        await Promise.all(promises);

        // register snapshots in the order of their presence
        snapshots.forEach(childSnapshot => {
            snapshot.registerChildActionSnapshot(childSnapshot);
        });
    }
}
