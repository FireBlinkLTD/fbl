import {ActionHandler, ActionSnapshot} from '../../models';
import {FBLService, FlowService} from '../../services';
import * as Joi from 'joi';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {Container} from 'typedi';

export class WhileActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.while',
        aliases: [
            'fbl.flow.while',
            'flow.while',
            'while'
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
        not: Joi.alternatives(
                Joi.string(),
                Joi.number(),
                Joi.boolean()
            ),
        is: Joi.alternatives(
                Joi.string(),
                Joi.number(),
                Joi.boolean()
            ),
        action: FBLService.STEP_SCHEMA
    })
        .xor('not', 'is')
        .required()
        .options({ abortEarly: true });

    getMetadata(): IActionHandlerMetadata {
        return WhileActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return WhileActionHandler.validationSchema;
    }

    /**
     * Check if should execute action
     * @param options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @param {IDelegatedParameters} parameters
     * @return {boolean}
     */
    static isShouldExecute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): boolean {
        const flowService = Container.get(FlowService);

        if (snapshot.childFailure) {

            return false;
        }

        const value = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, options.value, context, false, parameters);
        if (options.is !== undefined) {
            const is = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, options.is, context, false, parameters);

            return value.toString() === is.toString();
        } else {
            const not = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, options.not, context, false, parameters);

            return value.toString() !== not.toString();
        }
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const flowService = Container.get(FlowService);

        while (WhileActionHandler.isShouldExecute(options, context, snapshot, parameters)) {
            const idOrAlias = FBLService.extractIdOrAlias(options.action);
            let metadata = FBLService.extractMetadata(options.action);
            metadata = flowService.resolveOptionsWithNoHandlerCheck(context.ejsTemplateDelimiters.local, snapshot.wd, metadata, context, false, parameters);

            const childSnapshot = await flowService.executeAction(snapshot.wd, idOrAlias, metadata, options.action[idOrAlias], context, parameters);
            snapshot.registerChildActionSnapshot(childSnapshot);
        }
    }
}
