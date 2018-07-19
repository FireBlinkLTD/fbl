import {FlowService} from './services';
import {IContext, IFlow} from './interfaces';
import 'reflect-metadata';
import {Inject, Service} from 'typedi';
import * as Joi from 'joi';
import {ActionSnapshot} from './models';

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
     * @param {string} wd Working Directory
     * @param {IFlow} flow,
     * @param {IContext} context
     * @returns {Promise<ActionSnapshot>}
     */
    async execute(wd: string, flow: IFlow, context: IContext): Promise<ActionSnapshot> {
        const result = Joi.validate(flow, FireBlinkLogistics.validationSchema);
        if (result.error) {
            throw new Error(result.error.details.map(d => d.message).join('\n'));
        }

        const keys = Object.keys(flow.pipeline);

        const idOrAlias = keys[0];
        const options = flow.pipeline[idOrAlias];

        return await this.flowService.executeAction(wd, idOrAlias, options, context);
    }
}
