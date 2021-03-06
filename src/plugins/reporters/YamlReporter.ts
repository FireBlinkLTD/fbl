import {IReport, IReporter} from '../../interfaces';
import {promisify} from 'util';
import {dump} from 'js-yaml';
import {writeFile} from 'fs';

export class YamlReporter implements IReporter {
    /**
     * @inheritdoc
     */
    getName(): string {
        return 'yaml';
    }

    /**
     * @inheritdoc
     */
    async generate(output: string, options: {[key: string]: any}, report: IReport): Promise<void> {
        const sanitisedSnapshot = JSON.parse(JSON.stringify(report));
        await promisify(writeFile)(output, dump(sanitisedSnapshot), 'utf8');
    }
}
