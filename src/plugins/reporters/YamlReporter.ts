import {IReporter} from '../../interfaces';
import {promisify} from 'util';
import {ActionSnapshot} from '../../models';
import {dump} from 'js-yaml';
import {writeFile} from 'fs';

export class YamlReporter implements IReporter {
    getName(): string {
        return 'yaml';
    }

    async generate(output: string, options: {[key: string]: any}, snapshot: ActionSnapshot): Promise<void> {
        const sanitisedSnapshot = JSON.parse(JSON.stringify(snapshot));
        await promisify(writeFile)(output, dump(sanitisedSnapshot), 'utf8');
    }
}
