import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';
import {FSUtil, ContextUtil} from '../../utils';
import { FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA } from '../../schemas';

export class FindActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.find',
        aliases: [
            'fbl.fs.find',
            'fs.find',
            'find'            
        ]
    };

    private static validationSchema = Joi.object({
        include: Joi.array().items(
            Joi.string().min(1).required()
        ).min(1).required(),

        exclude: Joi.array().items(
            Joi.string().min(1).required()
        ),
        
        result: Joi.object({
            assignTo: FBL_ASSIGN_TO_SCHEMA,
            pushTo: FBL_PUSH_TO_SCHEMA,
        }).or('assignTo', 'pushTo').required()
    })        
        .required()
        .options({
            abortEarly: true
        });

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return FindActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return FindActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const result = await FSUtil.findFilesByMasks(
            options.include,
            options.exclude || [],
            snapshot.wd
        );

        /* istanbul ignore else */
        if (options.result.assignTo) {
            ContextUtil.assignTo(
                context,
                parameters,
                snapshot,
                options.result.assignTo,
                result
            );
        }

        /* istanbul ignore else */
        if (options.result.pushTo) {
            ContextUtil.pushTo(
                context,
                parameters,
                snapshot,
                options.result.pushTo,
                result
            );
        }
    }
}
