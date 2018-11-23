import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters, IIteration} from '../../interfaces';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {Container} from 'typedi';
import {FBL_ACTION_SCHEMA} from '../../schemas';

export class ForEachFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.foreach',
        aliases: [
            'fbl.flow.foreach',
            'flow.foreach',
            'foreach',
            'each'
        ],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true
    };

    private static validationSchema =
        Joi.object({
            of: Joi.alternatives(
                Joi.object(),
                Joi.array()
            ).required(),
            action: FBL_ACTION_SCHEMA,
            async: Joi.boolean()
        })
            .required()
            .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return ForEachFlowActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return ForEachFlowActionHandler.validationSchema;
    }

    async validate(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);
        options.of = await flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, options.of, context, false, parameters);

        if (options.async) {
            options.async = await flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, options.async, context, false, parameters);
        }

        await super.validate(options, context, snapshot, parameters);
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        const promises: Promise<void>[] = [];
        const snapshots: ActionSnapshot[] = [];

        const idOrAlias = FBLService.extractIdOrAlias(options.action);
        const isArray = Array.isArray(options.of);
        const iterable = isArray ? options.of : Object.keys(options.of);

        for (let i = 0; i < iterable.length; i++) {
            const iteration = <IIteration> {
                index: i
            };

            if (isArray) {
                iteration.value = iterable[i];
            } else {
                iteration.value = options.of[iterable[i]];
                iteration.key = iterable[i];
            }

            const iterationParams = JSON.parse(JSON.stringify(parameters));
            iterationParams.iteration = iteration;

            let metadata = FBLService.extractMetadata(options.action);
            metadata = await flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false, iterationParams);

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
