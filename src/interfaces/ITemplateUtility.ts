export interface ITemplateUtility {
    /**
     * Construct utilities
     * @param {string} wd
     * @return {{[key: string]: any}}
     */
    getUtilities(wd: string): {[key: string]: any};
}
