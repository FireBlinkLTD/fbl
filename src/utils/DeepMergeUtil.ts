import { ContextUtil } from './ContextUtil';

export class DeepMergeUtil {
    /**
     * Merge 2 arguments
     * @param arg1
     * @param arg2
     * @param modifiers
     */
    static merge(arg1: any, arg2: any, modifiers?: { [key: string]: Function }): any {
        const arg1Clone = ContextUtil.isMissing(arg1) ? arg1 : JSON.parse(JSON.stringify(arg1));
        const arg2Clone = ContextUtil.isMissing(arg2) ? arg2 : JSON.parse(JSON.stringify(arg2));

        return DeepMergeUtil.mergeUnknown(arg1Clone, arg2Clone, '$', modifiers);
    }

    /**
     * Merge unknown types
     * @param arg1
     * @param arg2
     * @param path
     * @param modifiers
     */
    private static mergeUnknown(arg1: any, arg2: any, path: string, modifiers?: { [key: string]: Function }): any {
        if (arg2 === undefined) {
            return arg1;
        }

        if (ContextUtil.isMissing(arg1)) {
            return arg2;
        }

        if (ContextUtil.isBasicType(arg1)) {
            return DeepMergeUtil.mergeBasic(arg1, arg2, path, modifiers);
        }

        if (Array.isArray(arg1)) {
            return DeepMergeUtil.mergeArrays(arg1, arg2, path, modifiers);
        }

        return DeepMergeUtil.mergeObjects(arg1, arg2, path, modifiers);
    }

    /**
     * Merge basic value types
     * @param arg1
     * @param arg2
     * @param path
     * @param modifiers
     */
    private static mergeBasic(arg1: any, arg2: any, path: string, modifiers?: { [key: string]: Function }): any {
        if (modifiers && modifiers[path]) {
            return modifiers[path](arg1, arg2);
        }

        return arg2;
    }

    /**
     * Merge objects
     * @param arg1
     * @param arg2
     * @param path
     * @param modifiers
     */
    private static mergeObjects(arg1: any, arg2: any, path: string, modifiers?: { [key: string]: Function }): any {
        if (!ContextUtil.isObject(arg2)) {
            throw new Error(`Unable to merge. Merge value at path ${path} is not an object.`);
        }

        if (modifiers && modifiers[path]) {
            return modifiers[path](arg1, arg2);
        }

        for (const key of Object.keys(arg2)) {
            const subPath = path + '.' + key;

            if (arg1[key] === undefined) {
                arg1[key] = arg2[key];
            } else {
                if (modifiers && modifiers[subPath]) {
                    arg1[key] = modifiers[subPath](arg1[key], arg2[key]);
                } else {
                    arg1[key] = DeepMergeUtil.mergeUnknown(arg1[key], arg2[key], subPath, modifiers);
                }
            }
        }

        return arg1;
    }

    private static mergeArrays(arg1: any[], arg2: any[], path: string, modifiers?: { [key: string]: Function }): any {
        if (!Array.isArray(arg2)) {
            throw new Error(`Unable to merge. Merge value at path ${path} is not an array.`);
        }

        if (modifiers && modifiers[path]) {
            return modifiers[path](arg1, arg2);
        } else {
            for (const item of arg2) {
                if (arg1.indexOf(item) < 0) {
                    arg1.push(item);
                }
            }
        }

        return arg1;
    }
}
