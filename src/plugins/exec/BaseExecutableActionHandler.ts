import {ActionHandler, ActionSnapshot} from '../../models';
import {IContext, IDelegatedParameters} from '../../interfaces';
import {ContextUtil} from '../../utils';
import {Container} from 'typedi';
import {ChildProcessService} from '../../services';

export abstract class BaseExecutableActionHandler extends ActionHandler {
    async exec(
        snapshot: ActionSnapshot,
        executable: string,
        args: any[],
        options?: {
            stdout?: boolean,
            stderr?: boolean,
            verbose?: boolean
        }
    ): Promise<{code: number, stdout?: string, stderr?: string, error?: any}> {
        const result: any = {
            stderr: '',
            stdout: '',
            code: -1
        };

        try {
            const on: any = {};

            if (options) {
                /* istanbul ignore else */
                if (options.verbose || options.stdout) {
                    on.stdout = (chunk: any) => {
                        /* istanbul ignore else */
                        if (options.verbose) {
                            snapshot.log(`stdout: ${chunk}`);
                        }

                        /* istanbul ignore else */
                        if (options.stdout) {
                            result.stdout += chunk.toString();
                        }
                    };
                }

                /* istanbul ignore else */
                if (options.verbose || options.stderr) {
                    on.stderr = (chunk: any) => {
                        /* istanbul ignore else */
                        if (options.verbose) {
                            snapshot.log(`stderr: ${chunk}`);
                        }

                        /* istanbul ignore else */
                        if (options.stderr) {
                            result.stderr += chunk.toString();
                        }
                    };
                }
            }

            result.code = await Container.get(ChildProcessService).exec(
                executable,
                args,
                snapshot.wd,
                on
            );

            if (result.code !== 0) {
                result.error = new Error(`Command ${executable} exited with non-zero code.`);
            }
        } catch (e) {
            result.code = -1;
            result.error = e;
        }

        return result;
    }

    async assignTo(
        snapshot: ActionSnapshot,
        context: IContext,
        parameters: IDelegatedParameters,
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

            await ContextUtil.assignTo(context, parameters, snapshot, assignTo, value);
        }

        if (result.error) {
            throw result.error;
        }
    }
}
