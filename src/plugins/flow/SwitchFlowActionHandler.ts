import {ActionHandler, ActionSnapshot} from '../../models';
import {Container} from 'typedi';
import * as Joi from 'joi';
import {FBLService, FlowService} from '../../services';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {FBL_ACTION_SCHEMA} from '../../schemas';

export class SwitchFlowActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.switch',
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
        value: Joi.alternatives(
            Joi.string(),
            Joi.number(),
            Joi.boolean()
        ).required(),
        is: Joi.object()
            .pattern(/^/, FBL_ACTION_SCHEMA)
            .min(1)
            .required(),
        else: FBL_ACTION_SCHEMA.optional()
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return SwitchFlowActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return SwitchFlowActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async validate(options: any, context: any, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        // register masked options in the snapshot
        const masked = await flowService.resolveOptionsWithNoHandlerCheck(
            context.ejsTemplateDelimiters.local, 
            options.value, 
            context, 
            snapshot, 
            parameters,
            true
        );
        snapshot.setOptions({
            value: masked,
            is: options.is
        });

        // resolve value, as it is mostly likely a template and we're not processing options as a template
        options.value = await flowService.resolveOptionsWithNoHandlerCheck(
            context.ejsTemplateDelimiters.local, 
            options.value, 
            context, 
            snapshot, 
            parameters,
            false
        );

        await super.validate(options, context, snapshot, parameters);
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        let action;
        for (const is of Object.keys(options.is)) {
            if (is.toString() === options.value.toString()) {
                action = options.is[is];
                break;
            }
        }

        if (!action) {
            if (options.else) {
                action = options.else;
            }
        }

        if (action) {
            const idOrAlias = FBLService.extractIdOrAlias(action);
            let metadata = FBLService.extractMetadata(action);
            metadata = await flowService.resolveOptionsWithNoHandlerCheck(
                context.ejsTemplateDelimiters.local, 
                metadata, 
                context, 
                snapshot, 
                parameters,
                false
            );

            snapshot.log(`Based on value: ${options.value} invoking handler: ${idOrAlias}`);
            const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, action[idOrAlias], context, parameters);
            snapshot.registerChildActionSnapshot(childSnapshot);
        } else {
            snapshot.log(`Unable to find handler for value: ${options.value}`, true);
        }
    }
}
