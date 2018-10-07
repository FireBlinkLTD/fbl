import {ActionHandlersRegistry} from '../services/ActionHandlersRegistry';

export interface IContext {
    /**
     * Current working directory (the place from where fbl command was executed).
     */
    cwd: string;

    /**
     * Context variables
     */
    ctx: {[key: string]: any};

    /**
     * Secret variables
     * Should not be exposed to report.
     * Plugins developers are responsible to not expose it in any way in the report.
     */
    secrets: {[key: string]: any};

    /**
     * Entities that were created/updated/removed during the flow execution
     */
    entities: {
        /**
         * Entities that were registered to exist (aggregated list of registered and created ones)
         */
        registered: IContextEntity[];

        /**
         * Entities that were removed or doesn't exist already
         */
        unregistered: IContextEntity[];

        /**
         * Entities that were created
         */
        created: IContextEntity[];

        /**
         * Entities that were updated
         */
        updated: IContextEntity[];

        /**
         * Entities that were removed/deleted
         */
        deleted: IContextEntity[];
    };

    dynamicActionHandlers: ActionHandlersRegistry;

    ejsTemplateDelimiters: {
        global: string,
        local: string
    };
}

export interface IContextEntity {
    type: string;
    id: string | number;
    payload?: any;
}
