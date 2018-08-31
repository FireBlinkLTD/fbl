/**
 * Various helper functions available for EJS options resolver as $.something,
 * where "something" is a static method/field name of this class.
 */
export class EJSTemplateUtils {
    /**
     * Convert anything into JSON string
     * @param anything
     * @return {string}
     */
    static toJSON(anything: any): string {
        return JSON.stringify(anything);
    }
}
