import {IPlugin} from '../../../src/interfaces';

/**
 * Incompatible plugin with current fbl version
 * @type {IPlugin}
 */
module.exports = <IPlugin> {
    name: 'incompatible.plugin',
    version: '1.0.0',
    requires: {
        fbl: '0.0.0'
    }
};
