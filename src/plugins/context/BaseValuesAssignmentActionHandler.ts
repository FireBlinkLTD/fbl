import {ActionHandler, ActionSnapshot} from '../../models';
import * as Joi from 'joi';
import {IContext, IDelegatedParameters} from '../../interfaces';
import {ContextUtil, FSUtil} from '../../utils';
import {Container} from 'typedi';
import {FlowService} from '../../services';
import {safeLoad} from 'js-yaml';

export abstract class BaseValuesAssignmentActionHandler extends ActionHandler {
    private static validationSchema = Joi.object()
        .pattern(
            /^\$(\.[^.]+)*$/,
            Joi.object({
                inline: Joi.any(),
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

    async validate(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await super.validate(options, context, snapshot, parameters);

        if (options.$ && options.$.inline) {
            const validationResult = Joi.validate(options.$.inline, Joi.object().required());
            if (validationResult.error) {
                throw new Error(validationResult.error.details.map(d => d.message).join('\n'));
            }
        }
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const key = this.getAssignmentKey();

        const flowService = Container.get(FlowService);

        const names = Object.keys(options);
        const promises = names.map(async (name: string): Promise<void> => {
            const priorityOnFiles = options[name].priority === 'files';

            if (options[name].files) {
                if ((options[name].inline || options[name].inline === null) && priorityOnFiles) {
                    await ContextUtil.assign(context[key], name, options[name].inline, options[name].override);
                }

                const files = await FSUtil.findFilesByMasks(options[name].files, [], snapshot.wd);

                for (const path of files) {
                    snapshot.log(`Reading from file: ${path} for key ${name}`);
                    let fileContent: string = await FSUtil.readTextFile(path);

                    // resolve global template
                    fileContent = flowService.resolveTemplate(
                        context.ejsTemplateDelimiters.global,
                        snapshot.wd,
                        fileContent,
                        context,
                        parameters
                    );

                    let fileContentObject = safeLoad(fileContent);

                    // resolve local template
                    fileContentObject = flowService.resolveOptionsWithNoHandlerCheck(
                        context.ejsTemplateDelimiters.local,
                        snapshot.wd,
                        fileContentObject,
                        context,
                        false,
                        parameters
                    );

                    await ContextUtil.assign(context[key], name, fileContentObject, options[name].override);
                }
            }

            if ((options[name].inline || options[name].inline === null) && !priorityOnFiles) {
                await ContextUtil.assign(context[key], name, options[name].inline, options[name].override);
            }
        });

        await Promise.all(promises);
    }
}
