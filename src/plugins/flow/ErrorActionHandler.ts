import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';

const version = require('../../../../package.json').version;

export class ErrorActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.error',
        version: version,
        aliases: [
            'fbl.flow.error',
            'flow.error',
            'error'
        ]
    };

    private static validationSchema = Joi.string().min(1).required()
        .options({abortEarly: true});

    getMetadata(): IActionHandlerMetadata {
        return ErrorActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return ErrorActionHandler.validationSchema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        throw new Error(options);
    }
}
