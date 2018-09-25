import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {IActionHandlerMetadata, IContext} from '../../interfaces';

const version = require('../../../../package.json').version;

export class SwitchFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.switch',
        version: version,
        aliases: [
            'fbl.flow.switch',
            'flow.switch',
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
            .pattern(/^/, FBLService.STEP_SCHEMA)
            .min(1)
            .required(),
        else: FBLService.STEP_SCHEMA.optional()
    })
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return SwitchFlowActionHandler.metadata;
    }

    async validate(options: any, context: any, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        // register masked options in the snapshot
        const masked = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, options.value, context, true, snapshot.iteration);
        snapshot.setOptions({
            value: masked,
            is: options.is
        });

        // resolve value, as it is mostly likely a template and we're not processing options as a template
        options.value = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, options.value, context, false, snapshot.iteration);

        await super.validate(options, context, snapshot);
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return SwitchFlowActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const flowService = Container.get(FlowService);

        let action = options.is[options.value];
        if (!action) {
            if (options.else) {
                action = options.else;
            }
        }

        if (action) {
            const idOrAlias = FBLService.extractIdOrAlias(action);
            let metadata = FBLService.extractMetadata(action);
            metadata = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false);

            snapshot.log(`Based on value: ${options.value} invoking handler: ${idOrAlias}`);
            const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, action[idOrAlias], context);
            snapshot.registerChildActionSnapshot(childSnapshot);
        } else {
            snapshot.log(`Unable to find handler for value: ${options.value}`);
        }
    }
}
