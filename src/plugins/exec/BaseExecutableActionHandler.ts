import {ActionHandler, ActionSnapshot} from '../../models';
import {spawn} from 'child_process';
import {IContext} from '../../interfaces';

export abstract class BaseExecutableActionHandler extends ActionHandler {
    async exec(
        snapshot: ActionSnapshot,
        executable: string,
        args: any[],
        options?: {
            stdout?: boolean,
            stderr?: boolean,
            silent?: boolean
        }
    ): Promise<{code: number, stdout?: string, stderr?: string, error?: any}> {
        const result: any = {
            stderr: '',
            stdout: '',
            code: -1
        };

        try {
            await new Promise<void>((resolve, reject) => {
                const process = spawn(executable, args, {
                    cwd: snapshot.wd,
                    shell: true
                });

                process.stdout.on('data', (data) => {
                    if (!options || !options.silent) {
                        snapshot.log(`stdout: ${data}`);
                    }

                    if (options && options.stdout) {
                        result.stdout += data.toString();
                    }
                });

                process.stderr.on('data', (data) => {
                    if (!options || !options.silent) {
                        snapshot.log(`stderr: ${data}`);
                    }

                    if (options && options.stderr) {
                        result.stderr += data.toString();
                    }
                });

                process.on('error', (e) => {
                    result.error = e;
                });

                process.on('close', (code) => {
                    result.code = code;

                    if (code === 0) {
                        resolve();
                    } else {
                        if (result.error) {
                            result.code = -1;
                            reject(result.error);
                        } else {
                            reject(new Error(`Command ${executable} returned non-zero code.`));
                        }
                    }
                });
            });
        } catch (e) {
            result.error = e;
        }

        return result;
    }

    async assignTo(
        snapshot: ActionSnapshot,
        context: IContext,
        assignTo: {ctx?: string, secrets?: string},
        result: {code: number, stdout?: string, stderr?: string, error?: any}
    ) {
        const shouldBeAssigned = assignTo && (assignTo.ctx || assignTo.secrets);
        if (shouldBeAssigned) {
            const value = {
                code: result.code,
                stdout: result.stdout,
                stderr: result.stderr
            };

            if (assignTo.ctx) {
                context.ctx[assignTo.ctx] = value;
            }

            if (assignTo.secrets) {
                context.secrets[assignTo.secrets] = value;
            }

            snapshot.setContext(context);
        }

        if (result.error) {
            throw result.error;
        }
    }
}
