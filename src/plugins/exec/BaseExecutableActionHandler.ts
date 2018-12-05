import {ActionHandler, ActionSnapshot} from '../../models';
import {IContext, IDelegatedParameters} from '../../interfaces';
import {ContextUtil} from '../../utils';
import {Container} from 'typedi';
import {ChildProcessService} from '../../services';

export abstract class BaseExecutableActionHandler extends ActionHandler {
    /**
     * Execute shell command
     * @param snapshot 
     * @param executable 
     * @param args 
     * @param wd 
     * @param options 
     */
    async exec(
        snapshot: ActionSnapshot,
        executable: string,
        args: any[],
        wd: string,
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
                wd,
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

    /**
     * Store execution result in context
     * @param snapshot 
     * @param context 
     * @param parameters 
     * @param assignTo 
     * @param pushTo 
     * @param result 
     */
    async storeResult(
        snapshot: ActionSnapshot,
        context: IContext,
        parameters: IDelegatedParameters,
        assignTo: {ctx?: string, secrets?: string, parameters?: string, override?: boolean},
        pushTo: {ctx?: string, secrets?: string, parameters?: string, override?: boolean, children?: boolean},
        result: {code: number, stdout?: string, stderr?: string, error?: any}
    ): Promise<void> {
        const value = {
            code: result.code,
            stdout: result.stdout,
            stderr: result.stderr
        };

        if (assignTo) {
            ContextUtil.assignTo(context, parameters, snapshot, assignTo, value);
        }

        if (pushTo) {
            ContextUtil.pushTo(context, parameters, snapshot, pushTo, value);
        }

        if (result.error) {
            throw result.error;
        }
    }
}
