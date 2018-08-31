import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IIteration} from '../../interfaces';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {Container} from 'typedi';

const version = require('../../../../package.json').version;

export class ForEachFlowHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.foreach',
        version: version,
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
            action: FBLService.STEP_SCHEMA,
            async: Joi.boolean()
        })
            .required()
            .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return ForEachFlowHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return ForEachFlowHandler.validationSchema;
    }

    async validate(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);
        options.of = flowService.resolveOptions(this, options.of, context, false);

        if (options.async) {
            options.async = flowService.resolveOptions(this, options.async, context, false);
        }

        await super.validate(options, context, snapshot);
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        const promises: Promise<void>[] = [];
        const snapshots: ActionSnapshot[] = [];

        const idOrAlias = FBLService.extractIdOrAlias(options.action);

        const iterable = Array.isArray(options.of) ? options.of : Object.keys(options.of);
        for (let i = 0; i < iterable.length; i++) {
            const iteration = <IIteration> {
                index: i,
                name: Array.isArray(options.of) ? undefined : iterable[i],
                value: Array.isArray(options.of) ? options.of[i] : options.of[iterable[i]]
            };

            if (options.async) {
                promises.push((async (iter): Promise<void> => {
                    snapshots[iter.index] = await flowService.executeAction(snapshot.wd, idOrAlias, options.action[idOrAlias], context, iter);
                })(iteration));
            } else {
                snapshots[i] = await flowService.executeAction(snapshot.wd, idOrAlias, options.action[idOrAlias], context, iteration);
            }
        }

        await Promise.all(promises);

        // register snapshots in the order of their presence
        snapshots.forEach(childSnapshot => {
            snapshot.registerChildActionSnapshot(childSnapshot);
        });
    }
}
