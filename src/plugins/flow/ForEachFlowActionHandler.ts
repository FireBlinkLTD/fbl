import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters, IIteration } from '../../interfaces';
import * as Joi from 'joi';
import { FlowService } from '../../services';
import { Container } from 'typedi';
import { FBL_ACTION_SCHEMA } from '../../schemas';
import { BaseFlowActionProcessor } from './BaseFlowActionProcessor';

export class ForEachFlowActionProcessor extends BaseFlowActionProcessor {
    private static validationSchema = Joi.object({
        shareParameters: Joi.boolean(),
        of: Joi.alternatives(Joi.object(), Joi.array()).required(),
        action: FBL_ACTION_SCHEMA,
        async: Joi.boolean(),
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return ForEachFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async validate(): Promise<void> {
        const flowService = Container.get(FlowService);
        this.options.of = await flowService.resolveOptionsWithNoHandlerCheck(
            this.context.ejsTemplateDelimiters.local,
            this.options.of,
            this.context,
            this.snapshot,
            this.parameters,
            false,
        );

        if (this.options.async) {
            this.options.async = await flowService.resolveOptionsWithNoHandlerCheck(
                this.context.ejsTemplateDelimiters.local,
                this.options.async,
                this.context,
                this.snapshot,
                this.parameters,
                false,
            );
        }

        await super.validate();
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const flowService = Container.get(FlowService);

        const promises: Promise<void>[] = [];
        const snapshots: ActionSnapshot[] = [];

        const isArray = Array.isArray(this.options.of);
        const iterable = isArray ? this.options.of : Object.keys(this.options.of);

        for (let i = 0; i < iterable.length; i++) {
            const iteration = <IIteration>{
                index: i,
            };

            if (isArray) {
                iteration.value = iterable[i];
            } else {
                iteration.value = this.options.of[iterable[i]];
                iteration.key = iterable[i];
            }

            const actionParameters = this.getParameters(this.options.shareParameters, iteration);

            if (this.options.async) {
                promises.push(
                    (async (p): Promise<void> => {
                        snapshots[p.iteration.index] = await flowService.executeAction(
                            this.snapshot.wd,
                            this.options.action,
                            this.context,
                            p,
                            this.snapshot,
                        );
                    })(actionParameters),
                );
            } else {
                snapshots[i] = await flowService.executeAction(
                    this.snapshot.wd,
                    this.options.action,
                    this.context,
                    actionParameters,
                    this.snapshot,
                );
            }
        }

        await Promise.all(promises);

        // register snapshots in the order of their presence
        snapshots.forEach(childSnapshot => {
            this.snapshot.registerChildActionSnapshot(childSnapshot);
        });
    }
}

export class ForEachFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.foreach',
        aliases: ['fbl.flow.foreach', 'flow.foreach', 'foreach', 'each'],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true,
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return ForEachFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getProcessor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        return new ForEachFlowActionProcessor(options, context, snapshot, parameters);
    }
}
