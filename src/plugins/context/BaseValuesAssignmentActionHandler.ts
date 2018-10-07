import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {IContext} from '../../interfaces';
import {ContextUtil, FSUtil} from '../../utils';

export abstract class BaseValuesAssignmentActionHandler extends ActionHandler {
    private static validationSchema = Joi.object()
        .pattern(
            /^\$(\.[^.]+)*$/,
            Joi.object({
                inline: Joi.object(),
                files: Joi.array().items(Joi.string()).min(1),
                priority: Joi.string().valid(['inline', 'files']),
                override: Joi.boolean()
            })
                .required()
                .or('inline', 'files')
                .unknown(false)
        )
        .min(1)
        .required()
        .options({ abortEarly: true });

    getValidationSchema(): Joi.SchemaLike | null {
        return BaseValuesAssignmentActionHandler.validationSchema;
    }

    abstract getAssignmentKey(): 'ctx' | 'secrets';

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const key = this.getAssignmentKey();

        const names = Object.keys(options);
        const promises = names.map(async (name: string): Promise<void> => {
            let value = undefined;

            const priority = options[name].priority || 'inline';

            if (options[name].inline && priority === 'files') {
                value = options[name].inline;
            }

            if (options[name].files) {
                const files = await FSUtil.findFilesByMasks(options[name].files, [], snapshot.wd);

                for (const path of files) {
                    snapshot.log(`Reading from file: ${path} for key ${name}`);
                    const fileContent = await FSUtil.readYamlFromFile(path);

                    const fileContentValidationResult = Joi.validate(fileContent, Joi.object().required());
                    if (fileContentValidationResult.error) {
                        throw new Error(fileContentValidationResult.error.details.map(d => d.message).join('\n'));
                    }

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

            await ContextUtil.assign(context[key], name, value, options[name].override);
        });
        snapshot.setContext(context);

        await Promise.all(promises);
    }
}