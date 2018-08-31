import {ActionHandler, ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import * as Joi from 'joi';
import {spawn} from 'child_process';

const version = require('../../../../package.json').version;

export class ExecActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.exec',
        version: version,
        aliases: [
            'fbl.exec',
            'exec'
        ]
    };

    private static validationSchema = Joi.object({
            command: Joi.string().min(1).required(),
            args: Joi.array().items(
                Joi.alternatives(
                    Joi.string().min(1),
                    Joi.number()
                )
            ),
            options: Joi.object({
                stdout: Joi.boolean(),
                stderr: Joi.boolean(),
                silent: Joi.boolean()
            }),
            assignTo: Joi.object({
                ctx: Joi.string().min(1),
                secrets: Joi.string().min(1)
            })
        })
        .required()
        .options({ abortEarly: true });

    getValidationSchema(): Joi.SchemaLike | null {
        return ExecActionHandler.validationSchema;
    }

    getMetadata(): IActionHandlerMetadata {
        return ExecActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const shouldBeAssigned = options.assignTo && (options.assignTo.ctx || options.assignTo.secrets);

        const result: any = {
            stderr: '',
            stdout: '',
            code: -1
        };

        try {
            await new Promise<void>((resolve, reject) => {
                const process = spawn(options.command, options.args, {
                    cwd: snapshot.wd,
                    shell: true
                });

                process.stdout.on('data', (data) => {
                    if (!options.options || !options.options.silent) {
                        snapshot.log(`stdout: ${data}`);
                    }

                    if (options.options && options.options.stdout && shouldBeAssigned) {
                        result.stdout += data.toString();
                    }
                });

                process.stderr.on('data', (data) => {
                    if (!options.options || !options.options.silent) {
                        snapshot.log(`stderr: ${data}`);
                    }

                    if (options.options && options.options.stderr && shouldBeAssigned) {
                        result.stderr += data.toString();
                    }
                });

                let rejected = false;
                process.on('error', (e) => {
                    rejected = true;
                    reject(e);
                });

                process.on('close', (code) => {
                    if (rejected) {
                        return;
                    }

                    result.code = code;

                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Command ${options.command} returned non-zero code.`));
                    }
                });
            });
        } finally {
            if (shouldBeAssigned) {
                if (options.assignTo.ctx) {
                    context.ctx[options.assignTo.ctx] = result;
                }

                if (options.assignTo.secrets) {
                    context.secrets[options.assignTo.secrets] = result;
                }

                snapshot.setContext(context);
            }
        }
    }
}
