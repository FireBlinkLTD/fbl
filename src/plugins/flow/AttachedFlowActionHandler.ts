import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { Container } from 'typedi';
import * as Joi from '@hapi/joi';
import { FBLService, FlowService } from '../../services';
import { IActionHandlerMetadata, IContext, IDelegatedParameters, IFlowLocationOptions } from '../../interfaces';
import { FSUtil } from '../../utils';

export class AttachedFlowActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.alternatives(
        Joi.string().min(1),
        Joi.object({
            path: Joi.string().min(1).required(),
            http: Joi.object({
                headers: Joi.object().min(1),
            }),
            target: Joi.string().min(1),
            cache: Joi.boolean(),
        }),
    )
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return AttachedFlowActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        if (typeof this.options === 'string') {
            this.options = <IFlowLocationOptions>{
                path: this.options,
            };
        }

        // get absolute path
        this.options.path = FSUtil.getAbsolutePath(this.options.path, this.snapshot.wd);

        const flowService = Container.get(FlowService);
        const fbl = Container.get(FBLService);

        this.snapshot.log(`Attaching flow at path ${this.options.path}.`);
        const flow = await flowService.readFlowFromFile(this.options, this.context, this.snapshot, this.parameters);

        const childSnapshot = await fbl.execute(this.options.path, flow.wd, flow.flow, this.context, this.parameters);
        this.snapshot.registerChildActionSnapshot(childSnapshot);
    }
}

export class AttachedFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.flow.attachment',
        aliases: ['fbl.flow.attachment', 'flow.attachment', 'attachment', '@'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return AttachedFlowActionHandler.metadata;
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
        return new AttachedFlowActionProcessor(options, context, snapshot, parameters);
    }
}
