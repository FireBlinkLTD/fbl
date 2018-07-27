import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {Container} from 'typedi';
import {FlowService} from '../../services';
import {IActionHandlerMetadata, IContext} from '../../interfaces';

export class ContextValuesAssignment extends ActionHandler {
    private static ROOT_KEY = '.';

    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.context.values',
        version: '1.0.0',
        description: 'Context values assignment. Either inline or from file for each key individually. Only top level keys are supported. Assignment directly to context is possible when "." key is provided.',
        aliases: [
            'fbl.context.values',
            'context.values',
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

    getMetadata(): IActionHandlerMetadata {
        return ContextValuesAssignment.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return ContextValuesAssignment.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        const names = Object.keys(options);
        const promises = names.map(async (name: string): Promise<void> => {
            let value = undefined;
            if (options[name].inline) {
                value = options[name].inline;
            }

            if (options[name].file) {
                const file = flowService.getAbsolutePath(options[name].file, snapshot.wd);
                snapshot.log(`Reading from file: ${file} into "ctx.${name}"`);
                value = await flowService.readYamlFromFile(file);
            }

            if (name === ContextValuesAssignment.ROOT_KEY) {
                Object.assign(context.ctx, value);
            } else {
                context.ctx[name] = value;
            }
        });
        snapshot.setContext(context);

        await Promise.all(promises);
    }
}
