import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FlowService} from '../../services';
import {IActionHandlerMetadata, IContext} from '../../interfaces';

export class SwitchFlowHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.switch',
        version: '1.0.0',
        description: 'Flow switcher. Allows to run one of few subflows based on the case.',
        aliases: [
            'fbl.switch',
            'switch',
            'if',
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
            .min(1)
            .required()
    })
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return SwitchFlowHandler.metadata;
    }

    async validate(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        // register masked options in the snapshot
        const masked = flowService.resolveOptionsWithNoHandlerCheck(options.value, context, true);
        snapshot.setOptions({
            value: masked,
            is: options.is
        });

        // resolve value, as it is mostly likely a template and we're not processing options as a template
        options.value = flowService.resolveOptionsWithNoHandlerCheck(options.value, context);

        await super.validate(options, context, snapshot);
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return SwitchFlowHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        const action = options.is[options.value];

        if (action) {
            const keys = Object.keys(action);
            const idOrAlias = keys[0];
            snapshot.log(`Based on value: ${options.value} invoking handler: ${idOrAlias}`);
            const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, action[idOrAlias], context);
            snapshot.registerChildActionSnapshot(childSnapshot);
        }
    }
}
