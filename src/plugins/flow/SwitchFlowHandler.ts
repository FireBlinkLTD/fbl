import {ActionHandler, IHandlerMetadata} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {SchemaLike} from 'joi';
import {FlowService} from '../../services';

export class SwitchFlowHandler extends ActionHandler {
    private static metadata = <IHandlerMetadata> {
        id: 'com.fireblink.fbl.switch',
        version: '1.0.0',
        description: 'Flow switcher. Allows to run one of few subflows based on the case.',
        aliases: [
            'fbl.switch',
            'switch',
            '?'
        ],
        // we don't want to process templates inside options in a default way as it may cause processing of templates
        // inside nested actions, but we will need to process "value" as it supposed to use template.
        skipTemplateProcessing: true
    };

    private static validationSchema = Joi.object({
        value: Joi.alternatives(Joi.string(), Joi.number()).required(),
        is: Joi.object()
            .pattern(
                /^/,
                Joi.object()
                    .min(1)
                    .max(1)
                    .required()
            )
            .required()
    })
        .required()
        .options({ abortEarly: true });

    getMetadata(): IHandlerMetadata {
        return SwitchFlowHandler.metadata;
    }

    async validate(options: any, context: any): Promise<void> {
        const flowService = Container.get(FlowService);

        // resolve value, as it is mostly likely a template and we're not processing options as a template
        options.value = flowService.resolveOptionsWithNoHandlerCheck(options.value, context);

        await super.validate(options, context);
    }

    getValidationSchema(): SchemaLike | null {
        return SwitchFlowHandler.validationSchema;
    }

    async execute(options: any, context: any): Promise<void> {
        const flowService = Container.get(FlowService);

        const action = options.is[options.value];

        if (action) {
            const keys = Object.keys(action);
            const idOrAlias = keys[0];
            await flowService.executeAction(idOrAlias, action[idOrAlias], context);
        }
    }
}
