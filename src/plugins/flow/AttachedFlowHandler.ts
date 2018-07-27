import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FlowService} from '../../services';
import {FireBlinkLogistics} from '../../fbl';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {dirname} from 'path';

export class AttachedFlowHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
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

    getMetadata(): IActionHandlerMetadata {
        return AttachedFlowHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return AttachedFlowHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);
        const fbl = Container.get(FireBlinkLogistics);

        const file = flowService.getAbsolutePath(options, snapshot.wd);
        snapshot.log(`Reading flow from file: ${file}`);
        const flow = await flowService.readFlowFromFile(file);

        const childSnapshot = await fbl.execute(
            dirname(file),
            flow,
            <IContext> {
                ctx: context.ctx
            }
        );
        snapshot.registerChildActionSnapshot(childSnapshot);
    }
}
