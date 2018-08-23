import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {Container} from 'typedi';
import {FlowService} from '../../services';
import {IActionHandlerMetadata, IContext} from '../../interfaces';

const version = require('../../../../package.json').version;

export abstract class BaseValuesAssignment extends ActionHandler {
    private static ROOT_KEY = '.';

    private static validationSchema = Joi.object()
        .pattern(
            /^/,
            Joi.object({
                inline: Joi.any(),
                files: Joi.array().items(Joi.string()).min(1),
                priority: Joi.string().valid(['inline', 'files'])
            })
                .required()
                .or('inline', 'files')
        )
        .min(1)
        .required()
        .options({ abortEarly: true });

    getValidationSchema(): Joi.SchemaLike | null {
        return BaseValuesAssignment.validationSchema;
    }

    abstract getAssignmentKey(): 'ctx' | 'secrets';

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);
        const key = this.getAssignmentKey();

        const names = Object.keys(options);
        const promises = names.map(async (name: string): Promise<void> => {
            let value = undefined;

            const priority = options[name].priority || 'inline';

            if (options[name].inline && priority === 'files') {
                value = options[name].inline;
            }

            if (options[name].files) {
                for (const file of options[name].files) {
                    const path = flowService.getAbsolutePath(file, snapshot.wd);
                    snapshot.log(`Reading from file: ${path} for key ${name}`);
                    const fileContent = await flowService.readYamlFromFile(path);
                    if (value) {
                        Object.assign(value, fileContent);
                    } else {
                        value = fileContent;
                    }
                }
            }

            if (options[name].inline && priority === 'inline') {
                if (value) {
                    Object.assign(value, options[name].inline);
                } else {
                    value = options[name].inline;
                }
            }

            if (name === BaseValuesAssignment.ROOT_KEY) {
                Object.assign(context[key], value);
            } else {
                context[key][name] = value;
            }
        });
        snapshot.setContext(context);

        await Promise.all(promises);
    }
}
