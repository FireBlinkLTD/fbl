import {IReporter} from '../../interfaces';
import {promisify} from 'util';
import {ActionSnapshot} from '../../models';
import {dump} from 'js-yaml';
import {writeFile} from 'fs';

export class YamlReporter implements IReporter {
    getName(): string {
        return 'yaml';
    }

    async generate(output: string, snapshot: ActionSnapshot): Promise<void> {
        await promisify(writeFile)(output, dump(snapshot), 'utf8');
    }
}
