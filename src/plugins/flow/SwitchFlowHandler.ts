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
        ]
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
