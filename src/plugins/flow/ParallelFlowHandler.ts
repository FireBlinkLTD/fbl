import {ActionHandler, IHandlerMetadata} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {SchemaLike} from 'joi';
import {FlowService} from '../../services';

export class ParallelFlowHandler extends ActionHandler {
    private static metadata = <IHandlerMetadata> {
        id: 'com.fireblink.fbl.parallel',
        version: '1.0.0',
        description: 'Parallel flow handler. Allows to run multiple subflows in parallel.',
        aliases: [
            'fbl.parallel',
            'parallel',
            '||'
        ],
        // We don't want to process options as a template to avoid unexpected behaviour inside nested actions
        skipTemplateProcessing: false
    };

    private static validationSchema = Joi.array()
        .items(Joi.object().min(1).max(1))
        .min(1)
        .required()
        .options({ abortEarly: true });

    getMetadata(): IHandlerMetadata {
        return ParallelFlowHandler.metadata;
    }

    getValidationSchema(): SchemaLike | null {
        return ParallelFlowHandler.validationSchema;
    }

    async execute(options: any, context: any): Promise<void> {
        const flowService = Container.get(FlowService);
        const errors: Error[] = [];
        const promises = options.map(async (action: any): Promise<void> => {
            try {
                const keys = Object.keys(action);
                const idOrAlias = keys[0];
                await flowService.executeAction(idOrAlias, action[idOrAlias], context);
            } catch (e) {
                errors.push(e);
            }
        });

        await Promise.all(promises);

        if (errors.length) {
            throw new Error(errors.join('\n\n'));
        }
    }
}
