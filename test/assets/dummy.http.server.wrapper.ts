import {ChildProcess, fork} from 'child_process';

export interface IDummyServerWrapperConfig {
    port: number;
    status?: number;
    delay?: number;
    file?: string;
    ignoreRequest?: boolean;
    redirectTo?: string;
}

export class DummyServerWrapper {
    public requestCount = 0;

    private server: ChildProcess | null = null;
    private onServerClose: Function | null = null;
    public lastRequest: any;

    constructor(public config: IDummyServerWrapperConfig) {
        if (this.config.redirectTo) {
            this.config.status = 302;
        }
    }

    private prepareOptions(): string[] {
        const options = [
            '-p', this.config.port.toString(),
            '-s', (this.config.status || 200).toString(),
            '-t', '1'
        ];

        if (this.config.delay) {
            options.push('-d', this.config.delay.toString());
        }

        if (this.config.ignoreRequest) {
            options.push('--ignore-request');
        }

        if (this.config.redirectTo) {
            options.push('-h', JSON.stringify({
                Location: this.config.redirectTo
            }));
        }

        options.push(this.config.file || 'missing_file.txt');

        return options;
    }

    /**
     * Start server
     * @return {Promise<void>}
     */
    async start(): Promise<void> {
        await this.stop();

        const options = this.prepareOptions();

        this.server = fork('dummy.http.server', options, {
            cwd: __dirname,
            silent: true
        });

        this.server.stdout.on('data', (data) => {
            console.error(`-> Server.stdout: ${data.toString().trim()}`);
        });

        this.server.stderr.on('data', (data) => {
            console.error(`-> Server.stderr: ${data.toString().trim()}`);
        });

        this.server.on('close', (code, signal) => {
            console.log('-> Server is stopped. Code: ' + code + '. Signal: ' + signal);
            this.server = null;

            if (this.onServerClose) {
                this.onServerClose();
                this.onServerClose = null;
            }
        });

        await new Promise((resolve, reject) => {
            this.server.on('message', (msg: any) => {
                if (msg.name === 'onRequest') {
                    this.requestCount++;
                    this.lastRequest = msg.payload;
                }

                if (msg.name === 'started') {
                    return resolve();
                }

                if (msg.name === 'failed') {
                    return reject(new Error('Server failed to start'));
                }
            });
        });
    }

    async stop(): Promise<void> {
        if (this.server) {
            console.log('-> Killing server...');

            // give system time to free port
            await new Promise(resolve => {
                this.onServerClose = resolve;
                this.server.kill('SIGINT');
            });
        }
    }
}
