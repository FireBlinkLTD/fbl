import { Service } from 'typedi';
import { FSUtil } from '../utils';

const tmp = require('tmp-promise');

@Service()
export class TempPathsRegistry {
    private tempPaths: string[];

    constructor() {
        this.tempPaths = [];
    }

    async createTempDir(keep = false): Promise<string> {
        const dir = await tmp.dir({
            keep,
        });

        if (!keep) {
            this.tempPaths.push(dir.path);
        }

        return dir.path;
    }

    async createTempFile(keep = false, postfix?: string): Promise<string> {
        const file = await tmp.file({
            keep,
            postfix,
        });

        if (!keep) {
            this.tempPaths.push(file.path);
        }

        return file.path;
    }

    async cleanup(): Promise<void> {
        await Promise.all(this.tempPaths.map(path => FSUtil.remove(path, true)));
    }
}
