import { IPlugin } from '../../interfaces';
import { ContextValuesAssignmentActionHandler } from './ContextValuesAssignmentActionHandler';
import { SecretValuesAssignmentActionHandler } from './SecretValuesAssignmentActionHandler';
import { SummaryRecordActionHandler } from './SummaryRecordActionHandler';

const version: string = require(process.env.FBL_ENV === 'test' ? '../../../package.json' : '../../../../package.json')
    .version;

module.exports = <IPlugin>{
    name: 'flb.core.context',
    version: version,

    actionHandlers: [
        new ContextValuesAssignmentActionHandler(),
        new SecretValuesAssignmentActionHandler(),
        new SummaryRecordActionHandler(),
    ],

    requires: {
        fbl: version,
    },
};
