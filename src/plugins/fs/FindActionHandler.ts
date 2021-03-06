import { ActionHandler, ActionSnapshot, ActionProcessor } from '../../models';
import { IActionHandlerMetadata, IContext, IDelegatedParameters } from '../../interfaces';
import * as Joi from 'joi';
import { FSUtil, ContextUtil } from '../../utils';
import { FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA } from '../../schemas';
import { ActionError } from '../../errors';

export class FindActionProcessor extends ActionProcessor {
    private static validationSchema = Joi.object({
        include: Joi.array().items(Joi.string().min(1).required()).min(1).required(),

        exclude: Joi.array().items(Joi.string().min(1).required()),

        result: Joi.object({
            baseDir: Joi.string().min(1),
            assignTo: FBL_ASSIGN_TO_SCHEMA,
            pushTo: FBL_PUSH_TO_SCHEMA,
        })
            .or('assignTo', 'pushTo')
            .required(),
    })
        .required()
        .options({
            abortEarly: true,
        });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return FindActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        let result = await FSUtil.findFilesByMasks(this.options.include, this.options.exclude || [], this.snapshot.wd);

        if (this.options.result.baseDir) {
            const baseDir = FSUtil.getAbsolutePath(this.options.result.baseDir, this.snapshot.wd);

            result = result.map((p) => {
                if (!p.startsWith(baseDir)) {
                    throw new ActionError(
                        `Unable to find baseDir "${this.options.result.baseDir}" in path "${p}"`,
                        '500',
                    );
                }

                return p.substring(baseDir.length + 1);
            });
        }

        /* istanbul ignore else */
        if (this.options.result.assignTo) {
            ContextUtil.assignTo(this.context, this.parameters, this.snapshot, this.options.result.assignTo, result);
        }

        /* istanbul ignore else */
        if (this.options.result.pushTo) {
            ContextUtil.pushTo(this.context, this.parameters, this.snapshot, this.options.result.pushTo, result);
        }
    }
}

export class FindActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.fs.find',
        aliases: ['fbl.fs.find', 'fs.find', 'find'],
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return FindActionHandler.metadata;
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
        return new FindActionProcessor(options, context, snapshot, parameters);
    }
}
