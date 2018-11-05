import {IReport, IReporter} from '../../interfaces';
import {promisify} from 'util';
import {writeFile} from 'fs';

export class JsonReporter implements IReporter {
    getName(): string {
        return 'json';
    }

    async generate(output: string, options: {[key: string]: any}, report: IReport): Promise<void> {
        const json = JSON.stringify(report, null, 2);
        await promisify(writeFile)(output, json, 'utf8');
    }
}
