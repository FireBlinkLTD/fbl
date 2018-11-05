import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {IActionHandlerMetadata, IContext, IDelegatedParameters, IFlowLocationOptions} from '../../interfaces';

const version = require('../../../../package.json').version;

export class AttachedFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.attachment',
        version: version,
        aliases: [
            'fbl.flow.attachment',
            'flow.attachment',
            'attachment',
            '@'
        ]
    };

    private static validationSchema = Joi.alternatives(
        Joi.string().min(1),
        Joi.object({
            path: Joi.string().min(1).required(),
            http: Joi.object({
                headers: Joi.object().min(1)
            }),
            target: Joi.string().min(1)
        })
    ).required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return AttachedFlowActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return AttachedFlowActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        if (typeof options === 'string') {
            options = <IFlowLocationOptions> {
                path: options
            };
        }

        const flowService = Container.get(FlowService);
        const fbl = Container.get(FBLService);

        snapshot.log(`Attaching flow: ${options.path}`);
        const flow = await flowService.readFlowFromFile(options, context, parameters, snapshot.wd);

        const childSnapshot = await fbl.execute(
            flow.wd,
            flow.flow,
            context,
            parameters
        );
        snapshot.registerChildActionSnapshot(childSnapshot);
    }
}
