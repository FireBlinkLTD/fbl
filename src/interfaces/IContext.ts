export interface IContext {
    /**
     * Context variables
     */
    ctx: {[key: string]: any};

    /**
     * Working directory
     */
    wd: string;
}
