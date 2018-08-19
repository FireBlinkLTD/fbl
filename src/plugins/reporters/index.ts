import {IPlugin} from '../../interfaces';
import {YamlReporter} from './YamlReporter';
import {JsonReporter} from './JsonReporter';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'fbl.core.reporters',
    version: version,

    requires: {
        fbl: version
    },

    reporters: [
        new YamlReporter(),
        new JsonReporter()
    ]
};
