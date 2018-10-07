import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {dirname} from 'path';
import {FSUtil} from '../../utils';

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

    private static validationSchema = Joi.string().min(1)
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return AttachedFlowActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return AttachedFlowActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);
        const fbl = Container.get(FBLService);

        const file = FSUtil.getAbsolutePath(options, snapshot.wd);
        snapshot.log(`Reading flow from file: ${file}`);
        const flow = await flowService.readFlowFromFile(file, context, snapshot.wd);

        const childSnapshot = await fbl.execute(
            dirname(file),
            flow,
            context
        );
        snapshot.registerChildActionSnapshot(childSnapshot);
    }
}
