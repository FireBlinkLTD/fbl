import { ActionProcessor } from '../../models';
import { ContextUtil, FSUtil } from '../../utils';
import { Container } from 'typedi';
import { ChildProcessService } from '../../services';

export abstract class BaseExecutableActionProcessor extends ActionProcessor {
    get childProcessService(): ChildProcessService {
        return Container.get(ChildProcessService);
    }

    /**
     * Execute shell command
     * @param executable
     * @param args
     * @param wd
     * @param options
     */
    async exec(
        executable: string,
        args: any[],
        wd?: string,
        options?: {
            stdout?: boolean;
            stderr?: boolean;
            verbose?: boolean;
        },
    ): Promise<{ code: number; stdout?: string; stderr?: string; error?: any }> {
        const result: any = {
            stderr: '',
            stdout: '',
            code: -1,
        };

        try {
            const on: any = {};

            if (options) {
                /* istanbul ignore else */
                if (options.verbose || options.stdout) {
                    on.stdout = (chunk: any) => {
                        /* istanbul ignore else */
                        if (options.verbose) {
                            console.log(chunk.toString().trim());
                            this.snapshot.log(`stdout: ${chunk}`, false, true);
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
                            console.error(chunk.toString().trim());
                            this.snapshot.log(`stderr: ${chunk}`, false, true);
                        }

                        /* istanbul ignore else */
                        if (options.stderr) {
                            result.stderr += chunk.toString();
                        }
                    };
                }
            }

            wd = wd ? FSUtil.getAbsolutePath(wd, this.snapshot.wd) : this.snapshot.wd;
            result.code = await this.childProcessService.exec(executable, args, wd, on);

            if (result.code !== 0) {
                result.error = new Error(`Command ${executable} exited with non-zero code.`);
            }
        } catch (e) {
            /* istanbul ignore next */
            result.code = -1;
            /* istanbul ignore next */
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
        assignTo: { ctx?: string; secrets?: string; parameters?: string; override?: boolean },
        pushTo: { ctx?: string; secrets?: string; parameters?: string; override?: boolean; children?: boolean },
        result: { code: number; stdout?: string; stderr?: string; error?: any },
    ): Promise<void> {
        const value = {
            code: result.code,
            stdout: result.stdout,
            stderr: result.stderr,
        };

        if (assignTo) {
            ContextUtil.assignTo(this.context, this.parameters, this.snapshot, assignTo, value);
        }

        if (pushTo) {
            ContextUtil.pushTo(this.context, this.parameters, this.snapshot, pushTo, value);
        }

        if (result.error) {
            throw result.error;
        }
    }
}
