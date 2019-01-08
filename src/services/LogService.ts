import { Service } from 'typedi';

@Service()
export class LogService {
    private infoEnabled = false;

    /**
     * Enable info logs
     */
    enableInfoLogs(): void {
        this.infoEnabled = true;
    }

    /**
     * Print info log
     * @param message
     */
    info(message: string) {
        if (this.infoEnabled) {
            console.log(message);
        }
    }

    /**
     * Print error log
     * @param message
     */
    error(message: string) {
        console.error(message);
    }
}
