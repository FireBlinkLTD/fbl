export class ContextUtil {
    private static OBJECT_PATH_REGEX = /^\$(\.[^.]+)*$/;
    private static FIELD_PATH_REGEX = /^\$\.[^.]+(\.[^.]+)*$/;

    /**
     * Assign value to context's object
     * @param obj
     * @param {string} path
     * @param value
     * @param {boolean} [override]
     */
    static async assign(obj: {[key: string]: any}, path: string, value: {[key: string]: any}, override: boolean = false): Promise<void> {
        if (!ContextUtil.OBJECT_PATH_REGEX.test(path)) {
            throw new Error(`Unable to assign value to path ${path}. Path has invalid format.`);
        }

        const chunks = path.split('.');

        let target: any = obj;

        let childPath = chunks[0];
        for (let i = 1; i < chunks.length; i++) {
            childPath += '.' + chunks[i];
            const candidate = target[chunks[i]];
            if (candidate === undefined || candidate === null) {
                target[chunks[i]] = {};
                target = target[chunks[i]];
            } else {
                if (typeof candidate !== 'object') {
                    throw new Error(`Unable to assign path: ${path}. Sub-path ${childPath} leads to non-object value.`);
                }

                target = candidate;
            }
        }

        if (override) {
            // cleanup object first
            for (const prop of Object.keys(target)) {
                delete target[prop];
            }
        }

        Object.assign(target, value);
    }

    /**
     * Assign value to context object's field
     * @param {{[p: string]: any}} obj
     * @param {string} path
     * @param value
     * @return {Promise<void>}
     */
    static async assignToField(obj: {[key: string]: any}, path: string, value: any): Promise<void> {
        if (!ContextUtil.FIELD_PATH_REGEX.test(path)) {
            throw new Error(`Unable to assign value to path ${path}. Path has invalid format.`);
        }

        const chunks = path.split('.');
        const fieldName = chunks[chunks.length - 1];
        const parentPath = path.substring(0, path.length - (fieldName.length + 1));

        await ContextUtil.assign(obj, parentPath,{ [fieldName]: value }, false);
    }
}