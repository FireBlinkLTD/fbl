import {FlowService} from './services';
import {IContext, IFlow} from './interfaces';
import 'reflect-metadata';
import {Inject, Service} from 'typedi';
import * as Joi from 'joi';

@Service()
export class FireBlinkLogistics {
    private static validationSchema = Joi.object({
            version: Joi.string()
                .regex(/\d+\.\d+\.\d+/gi)
                .required(),

            description: Joi.string(),

            pipeline: Joi.object()
                .min(1)
                .max(1)
                .required()

        })

        .options({ abortEarly: true });

    @Inject()
    flowService: FlowService;

    /**
     * Execute flow
     * @param {IFlow} flow,
     * @param {IContext} context
     * @returns {Promise<FireBlinkLogistics>}
     */
    async execute(flow: IFlow, context: IContext): Promise<FireBlinkLogistics> {
        const result = Joi.validate(flow, FireBlinkLogistics.validationSchema);
        if (result.error) {
            throw new Error(result.error.details.map(d => d.message).join('\n'));
        }

        const keys = Object.keys(flow.pipeline);

        const idOrAlias = keys[0];
        const options = flow.pipeline[idOrAlias];

        await this.flowService.executeAction(idOrAlias, options, context);

        return this;
    }
}
