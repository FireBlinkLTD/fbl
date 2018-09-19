import {IPlugin} from '../../interfaces';
import {ToJSONTemplateUtility} from './ToJSONTemplateUtility';
import {FSTemplateUtility} from './FSTemplateUtility';
import {HashTemplateUtility} from './HashTemplateUtility';
import {UUIDTemplateUtility} from './UUIDTemplateUtility';

const version: string = require('../../../../package.json').version;

module.exports = <IPlugin> {
    name: 'fbl.core.reporters',
    version: version,

    requires: {
        fbl: version
    },

    templateUtils: [
        new FSTemplateUtility(),
        new HashTemplateUtility(),
        new ToJSONTemplateUtility(),
        new UUIDTemplateUtility()
    ]
};
