import {IReporter} from '../../interfaces';
import {promisify} from 'util';
import {ActionSnapshot} from '../../models';
import {writeFile} from 'fs';

export class JsonReporter implements IReporter {
    getName(): string {
        return 'json';
    }

    async generate(output: string, options: {[key: string]: any}, snapshot: ActionSnapshot): Promise<void> {
        const json = JSON.stringify(snapshot, null, 2);
        await promisify(writeFile)(output, json, 'utf8');
    }
}
