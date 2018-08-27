import {IPlugin} from '../../../src/interfaces';

const version = require('../../../../package.json').version;

/**
 * Incompatible plugin with current fbl version
 * @type {IPlugin}
 */
module.exports = <IPlugin> {
    name: 'incompatible.plugin',
    version: '1.0.0',
    requires: {
        fbl: version,
        plugins: {
            'fbl.core.flow': version
        }
    }
};
