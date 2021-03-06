import { IPlugin } from '../../../src/interfaces';
import { join } from 'path';

const { version } = require(process.env.FBL_ENV === 'test' ? '../../../package.json' : '../../../../package.json');

/**
 * Incompatible plugin with current fbl version
 * @type {IPlugin}
 */
module.exports = <IPlugin>{
    name: 'compatible.plugin',
    version: '1.0.0',
    requires: {
        fbl: `>=${version}`,
        plugins: {
            'fbl.core.flow': `~${version}`,
            [join(__dirname, 'circularDependency1')]: '>=0.0.0',
        },
    },
};
