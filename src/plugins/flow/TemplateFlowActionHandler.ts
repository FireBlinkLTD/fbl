import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {Container} from 'typedi';
import {safeLoad} from 'js-yaml';
import {FBL_ACTION_SCHEMA} from '../../schemas';

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

    private static validationSchema = Joi.string()
        .min(1)
        .required()
        .options({abortEarly: true});

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return TemplateFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return TemplateFlowActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async validate(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await super.validate(options, context, snapshot, parameters);

        const action = safeLoad(options);
        const result = Joi.validate(action, FBL_ACTION_SCHEMA);
        if (result.error) {
            throw new Error(result.error.details.map(d => d.message).join('\n'));
        }
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        const action = safeLoad(options);
        const idOrAlias = FBLService.extractIdOrAlias(action);
        
        let metadata = FBLService.extractMetadata(action);
        metadata = await flowService.resolveOptionsWithNoHandlerCheck(
            context.ejsTemplateDelimiters.local, 
            metadata, 
            context, 
            snapshot, 
            parameters,
            false
        );

        const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, action[idOrAlias], context, parameters);
        snapshot.registerChildActionSnapshot(childSnapshot);
    }
}
