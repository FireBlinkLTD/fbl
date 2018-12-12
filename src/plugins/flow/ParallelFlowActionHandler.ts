import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {IActionHandlerMetadata, IContext, IDelegatedParameters, IIteration} from '../../interfaces';
import {FBL_ACTION_SCHEMA} from '../../schemas';
import { IMetadata } from '../../interfaces/IMetadata';

export class ParallelFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.parallel',
        aliases: [
            'fbl.flow.parallel',
            'flow.parallel',
            'parallel',
            'async',
            '||'
        ],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: true
    };

    private static actionsValidationSchema = Joi.array()
        .items(FBL_ACTION_SCHEMA)
        .min(1)
        .required()
        .options({ abortEarly: true });

    private static validationSchema = Joi.alternatives(
        ParallelFlowActionHandler.actionsValidationSchema,
        Joi.object()
            .keys({
                actions: ParallelFlowActionHandler.actionsValidationSchema,
                shareParameters: Joi.boolean()
            })
            .required()
            .options({
                allowUnknown: false,
                abortEarly: true
            })
    );    

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return ParallelFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return ParallelFlowActionHandler.validationSchema;
    }

    /**
     * Get parameters for single iteration
     * @param shareParameters
     * @param metadata 
     * @param parameters 
     * @param index 
     */
    private static getParameters(shareParameters: boolean, metadata: IMetadata, parameters: IDelegatedParameters, index: number): any {
        const result = <IDelegatedParameters> {
            iteration: {index}
        };  
        
        if (parameters && parameters.parameters !== undefined) {
            result.parameters = shareParameters ? parameters.parameters : JSON.parse(JSON.stringify(parameters.parameters));  
        }

        return result;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        let actions;
        let shareParameters = false;
        if (Array.isArray(options)) {
            actions = options;
        } else {
            actions = options.actions;
            shareParameters = options.shareParameters;
        }

        const snapshots: ActionSnapshot[] = [];
        const promises = actions.map(async (action: any, index: number): Promise<void> => {
            const idOrAlias = FBLService.extractIdOrAlias(action);
            let metadata = FBLService.extractMetadata(action);

            const iterationParams = ParallelFlowActionHandler.getParameters(
                shareParameters, 
                snapshot.metadata, 
                parameters, 
                index
            );
            
            metadata = await flowService.resolveOptionsWithNoHandlerCheck(
                context.ejsTemplateDelimiters.local, 
                metadata, 
                context, 
                snapshot,
                iterationParams,
                false
            );
            snapshots[index] = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, action[idOrAlias], context, iterationParams);
        });

        await Promise.all(promises);

        // register snapshots in the order of their presence
        snapshots.forEach(childSnapshot => {
            snapshot.registerChildActionSnapshot(childSnapshot);
        });
    }
}
