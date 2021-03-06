import * as Joi from 'joi';
import { load } from 'js-yaml';

import { ActionProcessor } from '../../models';
import { ContextUtil, FSUtil } from '../../utils';
import { FlowService } from '../../services';
import { ActionError, INVALID_CONFIGURATION } from '../../errors';

export abstract class BaseValuesAssignmentActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object()
        .pattern(
            /^\$(\.[^.]+)*$/,
            Joi.object({
                inline: Joi.any(),
                files: Joi.array().items(Joi.string()).min(1),
                priority: Joi.string().valid('inline', 'files'),
                override: Joi.boolean(),
                push: Joi.boolean(),
                children: Joi.boolean(),
            })
                .required()
                .or('inline', 'files')
                .unknown(false),
        )
        .min(1)
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return BaseValuesAssignmentActionProcessor.validationSchema;
    }

    /**
     * Get context field name to assign values
     */
    abstract getAssignmentKey(): 'ctx' | 'secrets';

    /**
     * Get value assignment target based on assignment key
     * @param context
     * @param parameters
     */
    private getAssignmentTarget(): any {
        const key = this.getAssignmentKey();

        return this.context[key];
    }

    /**
     * @inheritdoc
     */
    async validate(): Promise<void> {
        await super.validate();

        if (this.options.$ && this.options.$.inline) {
            try {
                Joi.assert(this.options.$.inline, Joi.object().required());
            } catch (e) {
                throw new ActionError(
                    (<Joi.ValidationError>e).details.map((d) => d.message).join('\n'),
                    INVALID_CONFIGURATION,
                );
            }
        }
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const target = this.getAssignmentTarget();

        const names = Object.keys(this.options);
        const promises = names.map(
            async (name: string): Promise<void> => {
                const option = this.options[name];
                let override = option.override;
                const children = option.children;
                const priorityOnFiles = option.priority === 'files';

                if (option.files) {
                    if ((option.inline !== undefined || option.inline === null) && priorityOnFiles) {
                        if (option.push) {
                            ContextUtil.push(target, name, option.inline, children, override);
                        } else {
                            ContextUtil.assign(target, name, option.inline, override);
                        }
                        override = false;
                    }

                    const files = await FSUtil.findFilesByMasks(option.files, [], this.snapshot.wd);

                    for (const path of files) {
                        this.snapshot.log(`Reading from file: ${path} for key ${name}`);
                        let fileContent: string = await FSUtil.readTextFile(path);

                        // resolve global template
                        fileContent = await FlowService.instance.resolveTemplate(
                            this.context.ejsTemplateDelimiters.global,
                            fileContent,
                            this.context,
                            this.snapshot,
                            this.parameters,
                        );

                        let fileContentObject = load(fileContent);

                        // resolve local template
                        fileContentObject = await FlowService.instance.resolveOptionsWithNoHandlerCheck(
                            this.context.ejsTemplateDelimiters.local,
                            fileContentObject,
                            this.context,
                            this.snapshot,
                            this.parameters,
                            false,
                        );

                        // resolve references
                        fileContentObject = ContextUtil.resolveReferences(
                            fileContentObject,
                            this.context,
                            this.parameters,
                        );

                        if (option.push) {
                            ContextUtil.push(target, name, fileContentObject, children, override);
                        } else {
                            ContextUtil.assign(target, name, fileContentObject, override);
                        }
                        override = false;
                    }
                }

                if ((option.inline !== undefined || option.inline === null) && !priorityOnFiles) {
                    if (option.push) {
                        ContextUtil.push(target, name, option.inline, children, override);
                    } else {
                        ContextUtil.assign(target, name, option.inline, override);
                    }
                }
            },
        );

        await Promise.all(promises);
    }
}
