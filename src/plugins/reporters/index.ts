import {IPlugin, IReporter} from '../../interfaces';
import {YamlReporter} from './YamlReporter';
import {JsonReporter} from './JsonReporter';

class FlowPlugin implements IPlugin {
    getReporters(): IReporter[] {
        return [
            new YamlReporter(),
            new JsonReporter()
        ];
    }
}

module.exports = new FlowPlugin();
