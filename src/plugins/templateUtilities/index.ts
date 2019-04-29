import { IPlugin } from '../../interfaces';
import { FSTemplateUtility } from './FSTemplateUtility';
import { HashTemplateUtility } from './HashTemplateUtility';
import { UUIDTemplateUtility } from './UUIDTemplateUtility';
import { NodeRequireTemplateUtility } from './NodeRequireTemplateUtility';
import { DurationTemplateUtility } from './DurationTemplateUtility';
import { ContextTemplateUtility } from './ContextTemplateUtility';

const version: string = require(process.env.FBL_ENV === 'test' ? '../../../package.json' : '../../../../package.json')
    .version;

module.exports = <IPlugin>{
    name: 'fbl.core.reporters',
    version: version,

    requires: {
        fbl: version,
    },

    templateUtils: [
        new ContextTemplateUtility(),
        new DurationTemplateUtility(),
        new FSTemplateUtility(),
        new HashTemplateUtility(),
        new NodeRequireTemplateUtility(),
        new UUIDTemplateUtility(),
    ],
};
