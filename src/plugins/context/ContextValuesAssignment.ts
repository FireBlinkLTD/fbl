import {ActionHandler, IHandlerMetadata} from '../../models';
import * as Joi from 'joi';
import {Container} from 'typedi';
import {FlowService} from '../../services';
import {SchemaLike} from 'joi';

export class ContextValuesAssignment extends ActionHandler {
    private static metadata = <IHandlerMetadata> {
        id: 'com.fireblink.fbl.context.assignValues.inline',
        version: '1.0.0',
        description: 'Context values assignment. Either inline or from file for each key individually. Only top level keys are supported.',
        aliases: [
            'fbl.context.assign.inline',
            'context.assign.inline',
            'context',
            'ctx'
        ]
    };

    private static validationSchema = Joi.object()
        .pattern(
            /^/,
            Joi.object({
                    inline: Joi.any(),
                    file: Joi.string()
                })
                .or('inline', 'file')
                .without('inline', 'file')
                .required()
        )
        .min(1)
        .required()
        .options({ abortEarly: true });

    getMetadata(): IHandlerMetadata {
        return ContextValuesAssignment.metadata;
    }

    getValidationSchema(): SchemaLike | null {
        return ContextValuesAssignment.validationSchema;
    }

    async execute(options: any, context: any): Promise<void> {
        const flowService = Container.get(FlowService);

        const names = Object.keys(options);
        const promises = names.map(async (name: string): Promise<void> => {
            if (options[name].inline) {
                context.ctx[name] = options[name].inline;
            }

            if (options[name].file) {
                context.ctx[name] = await flowService.readYamlFromFile(options[name].file);
            }
        });

        await Promise.all(promises);
    }
}
