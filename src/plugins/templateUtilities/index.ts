import {IPlugin} from '../../interfaces';
import {FSTemplateUtility} from './FSTemplateUtility';
import {HashTemplateUtility} from './HashTemplateUtility';
import {UUIDTemplateUtility} from './UUIDTemplateUtility';
import {NodeRequireTemplateUtility} from './NodeRequireTemplateUtility';
import {DurationTemplateUtility} from './DurationTemplateUtility';
import {EscapeTemplateUtility} from './EscapeTemplateUtility';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'fbl.core.reporters',
    version: version,

    requires: {
        fbl: version
    },

    templateUtils: [
        new DurationTemplateUtility(),
        new FSTemplateUtility(),
        new HashTemplateUtility(),
        new NodeRequireTemplateUtility(),
        new EscapeTemplateUtility(),
        new UUIDTemplateUtility()
    ]
};
