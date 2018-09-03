/**
 * Various helper functions available for EJS options resolver as $.something,
 * where "something" is a static method/field name of this class.
 */
import {FSUtil} from './FSUtil';

export class EJSTemplateUtil {
    constructor(
        private wd: string
    ) {}

    /**
     * Convert anything into JSON string
     * @param anything
     * @return {string}
     */
    toJSON(anything: any): string {
        return JSON.stringify(anything);
    }

    /**
     * Get absolute path
     * @param path
     * @param {string} wd
     * @return {string}
     */
    getAbsolutePath(path: any): string {
        return FSUtil.getAbsolutePath(path, this.wd);
    }
}
