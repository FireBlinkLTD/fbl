import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {Container} from 'typedi';
import {safeLoad} from 'js-yaml';

export class TemplateFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.template',
        aliases: [
            'fbl.flow.template',
            'flow.template',
            'template',
            'tpl'
        ]
    };

    private static validationSchema = Joi.string().min(1).required()
        .options({abortEarly: true});

    getMetadata(): IActionHandlerMetadata {
        return TemplateFlowActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return TemplateFlowActionHandler.validationSchema;
    }

    async validate(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await super.validate(options, context, snapshot, parameters);

        const action = safeLoad(options);
        const result = Joi.validate(action, FBLService.STEP_SCHEMA);
        if (result.error) {
            throw new Error(result.error.details.map(d => d.message).join('\n'));
        }
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        const action = safeLoad(options);
        const idOrAlias = FBLService.extractIdOrAlias(action);
        let metadata = FBLService.extractMetadata(action);
        metadata = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false, parameters);

        const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, action[idOrAlias], context, parameters);
        snapshot.registerChildActionSnapshot(childSnapshot);
    }
}
