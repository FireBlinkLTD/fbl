import { ActionSnapshot, ActionProcessor, ActionHandler } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from 'joi';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { BaseExecutableActionProcessor } from './BaseExecutableActionProcessor';
import { Container } from 'typedi';
import { TempPathsRegistry } from '../../services';
import { FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA } from '../../schemas';

export class SheelActionProcessor extends BaseExecutableActionProcessor {
    private static validationSchema = Joi.object({
        executable: Joi.string()
            .min(1)
            .required(),
        script: Joi.string()
            .min(1)
            .required(),
        options: Joi.object({
            stdout: Joi.boolean(),
            stderr: Joi.boolean(),
            verbose: Joi.boolean(),
        }),
        assignResultTo: FBL_ASSIGN_TO_SCHEMA,
        pushResultTo: FBL_PUSH_TO_SCHEMA,
        wd: Joi.string().min(1),
    })
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return SheelActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const file = await Container.get(TempPathsRegistry).createTempFile();
        await promisify(writeFile)(file, this.options.script, 'utf8');

        const result: any = await this.exec(
            this.options.executable,
            [file],
            this.options.wd || this.snapshot.wd,
            this.options.options,
        );

        await this.storeResult(this.options.assignResultTo, this.options.pushResultTo, result);
    }
}

export class ShellActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.shell',
        aliases: ['fbl.shell', 'shell'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return ShellActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getProcessor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        return new SheelActionProcessor(options, context, snapshot, parameters);
    }
}
