import { ActionHandlersRegistry } from '../services';
import { ISummaryRecord } from './ISummaryRecord';

export interface IContextBase {
    /**
     * Context variables
     */
    ctx: { [key: string]: any };

    /**
     * Summary report records
     */
    summary: ISummaryRecord[];
}

export interface IContext extends IContextBase {
    /**
     * Current working directory (the place from where fbl command was executed).
     */
    cwd: string;

    /**
     * Secret variables
     * Should not be exposed to report.
     * Plugins developers are responsible to not expose it in any way in the report.
     */
    secrets: { [key: string]: any };

    dynamicActionHandlers: ActionHandlersRegistry;

    ejsTemplateDelimiters: {
        global: string;
        local: string;
    };
}
