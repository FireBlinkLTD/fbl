import {ActionHandler, IHandlerMetadata} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {SchemaLike} from 'joi';
import {FlowService} from '../../services';
import {FireBlinkLogistics} from '../../fbl';

export class AttachedFlowHandler extends ActionHandler {
    private static metadata = <IHandlerMetadata> {
        id: 'com.fireblink.fbl.attached',
        version: '1.0.0',
        description: 'Attached flow handler. Allows to attach another flow as a subflow.',
        aliases: [
            'fbl.attachment',
            'attachment',
            '@'
        ]
    };

    private static validationSchema = Joi.string().min(1)
        .required()
        .options({ abortEarly: true });

    getMetadata(): IHandlerMetadata {
        return AttachedFlowHandler.metadata;
    }

    getValidationSchema(): SchemaLike | null {
        return AttachedFlowHandler.validationSchema;
    }

    async execute(options: any, context: any): Promise<void> {
        const flowService = Container.get(FlowService);
        const fbl = Container.get(FireBlinkLogistics);

        const flow = await flowService.readFlowFromFile(options);
        await fbl.execute(flow, context);
    }
}
