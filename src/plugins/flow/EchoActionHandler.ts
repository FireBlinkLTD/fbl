import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import * as Joi from 'joi';

export class EchoActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.flow.echo',
        aliases: [
            'fbl.flow.echo',
            'flow.echo',
            'echo'
        ]
    };

    private static validationSchema = Joi.any().required()
        .options({abortEarly: true});

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return EchoActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return EchoActionHandler.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        console.log(options);
    }
}
