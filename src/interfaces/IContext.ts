export interface IContext {
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
}
