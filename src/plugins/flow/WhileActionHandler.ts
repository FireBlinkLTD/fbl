import {ActionHandler, ActionSnapshot} from '../../models';
import {FBLService, FlowService} from '../../services';
import * as Joi from 'joi';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {Container} from 'typedi';
import {FBL_ACTION_SCHEMA} from '../../schemas';
import { IMetadata } from '../../interfaces/IMetadata';

export class WhileActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.while',
        aliases: [
            'fbl.flow.while',
            'flow.while',
            'while'
        ],
        // we don't want to process templates inside options in a default way as it may cause processing of templates
        // inside nested actions, but we will need to process "value" as it supposed to use template.
        skipTemplateProcessing: true
    };

    private static validationSchema = Joi.object({
        shareParameters: Joi.boolean(),
        value: Joi.alternatives(
                Joi.string(),
                Joi.number(),
                Joi.boolean()
            ).required(),
        not: Joi.alternatives(
                Joi.string(),
                Joi.number(),
                Joi.boolean()
            ),
        is: Joi.alternatives(
                Joi.string(),
                Joi.number(),
                Joi.boolean()
            ),
        action: FBL_ACTION_SCHEMA
    })
        .xor('not', 'is')
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return WhileActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return WhileActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async isShouldExecute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<boolean> {
        const flowService = Container.get(FlowService);

        if (snapshot.childFailure) {

            return false;
        }

        const value = await flowService.resolveOptionsWithNoHandlerCheck(
            context.ejsTemplateDelimiters.local, 
            options.value,
            context, 
            snapshot, 
            parameters,
            false
        );
        if (options.is !== undefined) {
            const is = await flowService.resolveOptionsWithNoHandlerCheck(
                context.ejsTemplateDelimiters.local, 
                options.is, 
                context, 
                snapshot,
                parameters,
                false
            );

            return value.toString() === is.toString();
        } else {
            const not = await flowService.resolveOptionsWithNoHandlerCheck(
                context.ejsTemplateDelimiters.local, 
                options.not, 
                context, 
                snapshot, 
                parameters,
                false
            );

            return value.toString() !== not.toString();
        }
    }

    /**
     * Get parameters for single iteration
     * @param shareParameters
     * @param metadata 
     * @param parameters 
     * @param index 
     */
    private static getParameters(shareParameters: boolean, metadata: IMetadata, parameters: IDelegatedParameters, index: number): any {
        const actionParameters: IDelegatedParameters = shareParameters ? parameters : JSON.parse(JSON.stringify(parameters));
        actionParameters.iteration = {index};
        
        return actionParameters;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        let actionParameters: any = WhileActionHandler.getParameters(options.shareParameters, snapshot.metadata, parameters, 0);
        
        let execute = await this.isShouldExecute(options, context, snapshot, actionParameters);
        while (execute) {
            const idOrAlias = FBLService.extractIdOrAlias(options.action);
            let metadata = FBLService.extractMetadata(options.action);
            metadata = await flowService.resolveOptionsWithNoHandlerCheck(
                context.ejsTemplateDelimiters.local, 
                metadata, 
                context, 
                snapshot,
                actionParameters,
                false
            );

            const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, options.action[idOrAlias], context, actionParameters);
            snapshot.registerChildActionSnapshot(childSnapshot);

            actionParameters = WhileActionHandler.getParameters(options.shareParameters, snapshot.metadata, parameters, 0);
            execute = await this.isShouldExecute(options, context, snapshot, actionParameters);
        }
    }
}
