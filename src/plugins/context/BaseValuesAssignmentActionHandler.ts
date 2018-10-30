import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {IContext, IFlow} from '../../interfaces';
import {ContextUtil, FSUtil} from '../../utils';
import {Container} from 'typedi';
import {FlowService} from '../../services';
import {safeLoad} from 'js-yaml';

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

        const flowService = Container.get(FlowService);

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
                    let fileContent: string = await FSUtil.readTextFile(path);

                    // resolve global template
                    fileContent = flowService.resolveTemplate(
                        context.ejsTemplateDelimiters.global,
                        snapshot.wd,
                        fileContent,
                        context
                    );

                    let fileContentObject = safeLoad(fileContent);

                    const fileContentValidationResult = Joi.validate(fileContentObject, Joi.object().required());
                    if (fileContentValidationResult.error) {
                        throw new Error(fileContentValidationResult.error.details.map(d => d.message).join('\n'));
                    }

                    // resolve local template
                    fileContentObject = flowService.resolveOptionsWithNoHandlerCheck(
                        context.ejsTemplateDelimiters.local,
                        snapshot.wd,
                        fileContentObject,
                        context,
                        false
                    );

                    if (value) {
                        Object.assign(value, fileContentObject);
                    } else {
                        value = fileContentObject;
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

        await Promise.all(promises);
    }
}
