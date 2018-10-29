import {ChildProcess, spawn} from 'child_process';
import {Service} from 'typedi';

@Service()
export class ChildProcessService {
    /**
     * Execute command
     * @param {string} executable
     * @param {any[]} args
     * @param {string} wd
     * @param {object} on stdout/stderr handlers
     * @return {Promise<number>}
     */
    async exec(
        executable: string,
        args: any[],
        wd: string,
        on?: {
            stdout?: (chunk: any) => void,
            stderr?: (chunk: any) => void,
            process?: (process: ChildProcess) => void,
        }
    ): Promise<number> {
        let exitCode = -1;

        await new Promise<void>((resolve, reject) => {
            const process = spawn(executable, args, {
                cwd: wd,
                shell: true
            });

            if (on && on.stdout) {
                process.stdout.on('data', (data) => {
                    on.stdout(data);
                });
            }

            if (on && on.stderr) {
                process.stderr.on('data', (data) => {
                    on.stderr(data);
                });
            }

            if (on && on.process) {
                on.process(process);
            }

            let error: Error;
            process.on('error', (e) => {
                error = e;
            });

            process.on('close', (code) => {
                exitCode = code;

                if (error) {
                    exitCode = -1;

                    return reject(error);
                }

                resolve();
            });
        });

        return exitCode;
    }
}
