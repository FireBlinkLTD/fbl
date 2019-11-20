import { IContext, IContextBase, IDelegatedParameters, IPushTo, IAssignTo } from '../interfaces';
import { ActionHandlersRegistry } from '../services/';
import { ActionSnapshot } from '../models';
import { isObject, isBasicType, isMissing } from 'object-collider';

export class ContextUtil {
    private static OBJECT_PATH_REGEX = /^\$(\.[^.]+)*$/;
    private static FIELD_PATH_REGEX = /^\$\.[^.]+(\.[^.]+)*$/;
    private static REFERENCE_REGEX = /^\s*\$ref:(env|cwd|ctx|secrets|entities|parameters|iteration)((\.[^.]+)+)?\s*$/;

    /**
     * Assign value based on paths
     * @param {IContext} context
     * @param {IDelegatedParameters} parameters
     * @param {ActionSnapshot} snapshot
     * @param {IAssignTo | string} paths
     * @param value
     * @param {boolean} override
     * @return {void}
     */
    static assignTo(
        context: IContext,
        parameters: IDelegatedParameters,
        snapshot: ActionSnapshot,
        paths: IAssignTo | string,
        value: any,
    ): void {
        if (!paths) {
            return;
        }

        let override = false;
        if (typeof paths === 'string') {
            const chunks = paths.split('.');
            const target = chunks[1];
            chunks.splice(0, 2);
            paths = {
                [target]: `$.${chunks.join('.')}`,
            };
        } else {
            override = paths.override;
        }

        /* istanbul ignore else */
        if (paths.ctx) {
            ContextUtil.assignToField(context.ctx, paths.ctx, value, override);
            snapshot.setContext(context);
        }

        /* istanbul ignore else */
        if (paths.secrets) {
            ContextUtil.assignToField(context.secrets, paths.secrets, value, override);
        }

        /* istanbul ignore else */
        if (paths.parameters) {
            /* istanbul ignore else */
            if (!parameters.parameters) {
                parameters.parameters = {};
            }

            ContextUtil.assignToField(parameters.parameters, paths.parameters, value, override);
        }
    }

    /**
     * Push value based on paths
     * @param {IContext} context
     * @param {IDelegatedParameters} parameters
     * @param {ActionSnapshot} snapshot
     * @param {IPushTo | string} paths
     * @param value
     * @return {Promise<void>}
     */
    static pushTo(
        context: IContext,
        parameters: IDelegatedParameters,
        snapshot: ActionSnapshot,
        paths: IPushTo | string,
        value: any,
    ): void {
        if (!paths) {
            return;
        }

        let override = false;
        let children = false;
        if (typeof paths === 'string') {
            const chunks = paths.split('.');
            const target = chunks[1];
            chunks.splice(0, 2);
            paths = {
                [target]: `$.${chunks.join('.')}`,
            };
        } else {
            override = paths.override;
            children = paths.children;
        }

        /* istanbul ignore else */
        if (paths.ctx) {
            ContextUtil.push(context.ctx, paths.ctx, value, children, override);
            snapshot.setContext(context);
        }

        /* istanbul ignore else */
        if (paths.secrets) {
            ContextUtil.push(context.secrets, paths.secrets, value, children, override);
        }

        /* istanbul ignore else */
        if (paths.parameters) {
            /* istanbul ignore else */
            if (!parameters.parameters) {
                parameters.parameters = {};
            }

            ContextUtil.push(parameters.parameters, paths.parameters, value, override);
        }
    }

    /**
     * Push value or its child objects to obj by given path
     * @param {{[p: string]: any}} obj
     * @param {string} path
     * @param value
     * @param {boolean} children
     * @param {boolean} override
     * @return {void}
     */
    static push(obj: { [key: string]: any }, path: string, value: any, children: boolean, override = false): void {
        if (!ContextUtil.OBJECT_PATH_REGEX.test(path)) {
            throw new Error(`Unable to push value to path "${path}". Path has invalid format.`);
        }

        const isArray = Array.isArray(value);
        if (!isArray && children) {
            throw new Error(`Unable to push child records of value to path "${path}". Value is not an array.`);
        }

        const searchResult = ContextUtil.findTargetByPath(obj, path, []);

        if (!Array.isArray(searchResult.target)) {
            throw new Error(`Unable to push value to path "${path}". Target is not array.`);
        }

        if (override) {
            searchResult.target = searchResult.parent[searchResult.key] = [];
        }

        if (children) {
            searchResult.target.push(...value);
        } else {
            searchResult.target.push(value);
        }
    }

    /**
     * Find target by given path
     * @param {{[p: string]: any}} path
     * @param {string} leaf
     * @return {{target: any; parent: {[p: string]: any}; key: string; subPath: string}}
     */
    private static findTargetByPath(
        obj: { [key: string]: any },
        path: string,
        leaf: any,
    ): { target: any; parent: { [key: string]: any }; key: string } {
        const chunks = path.split('.');

        let target: any = obj;
        let parent: { [key: string]: any } = null;
        let key: string = null;

        let subPath = chunks[0];
        for (let i = 1; i < chunks.length; i++) {
            parent = target;
            key = chunks[i];
            subPath += '.' + key;

            const candidate = target[chunks[i]];
            const isLast = i === chunks.length - 1;
            if (isMissing(candidate)) {
                target[chunks[i]] = isLast ? leaf : {};
                target = target[chunks[i]];
            } else {
                if (!isLast) {
                    if (!isObject(candidate)) {
                        throw new Error(
                            `Unable to assign path "${path}". Sub-path "${subPath}" leads to non-object value.`,
                        );
                    }
                }

                target = candidate;
            }
        }

        return {
            target,
            parent,
            key,
        };
    }

    /**
     * Assign value to context's object
     * @param obj
     * @param {string} path
     * @param value
     * @param {boolean} [override]
     * @returns {void}
     */
    static assign(obj: { [key: string]: any }, path: string, value: any, override: boolean): void {
        if (!ContextUtil.OBJECT_PATH_REGEX.test(path)) {
            throw new Error(`Unable to assign value to path "${path}". Path has invalid format.`);
        }

        const isAssignable = !isBasicType(value) && !Array.isArray(value) && !isMissing(value);

        const { target, parent, key } = ContextUtil.findTargetByPath(obj, path, {});

        if (isAssignable) {
            if (typeof target !== 'object') {
                throw new Error(`Unable to assign path "${path}". Target is not an object.`);
            }

            if (override) {
                // cleanup object first
                for (const prop of Object.keys(target)) {
                    delete target[prop];
                }
            }

            Object.assign(target, value);
        } else {
            if (!parent) {
                throw new Error('Unable to assign non-object value to root path.');
            }

            parent[key] = value;
        }
    }

    /**
     * Find value at given path
     * @param obj
     * @param path
     */
    static getValueAtPath(obj: { [key: string]: any }, path: string): any {
        const chunks = path.split('.');

        let subPath = '$';
        for (let i = 1; i < chunks.length; i++) {
            const name = chunks[i];

            if (isMissing(obj) || !isObject(obj)) {
                throw new Error(
                    `Unable to get value at path "${path}". Sub-path "${subPath}" leads to non-object value.`,
                );
            }

            subPath += '.' + name;
            obj = obj[name];
        }

        return obj;
    }

    /**
     * Assign value to context object's field
     * @param {object} obj
     * @param {string} path
     * @param value
     * @param override
     * @return {void}
     */
    static assignToField(obj: { [key: string]: any }, path: string, value: any, override: boolean): void {
        if (!ContextUtil.FIELD_PATH_REGEX.test(path)) {
            throw new Error(`Unable to assign value to path "${path}". Path has invalid format.`);
        }

        const fieldName = path.split('.').pop();
        const parentPath = ContextUtil.getParentPath(path);

        ContextUtil.assign(obj, parentPath, { [fieldName]: value }, false);
    }

    /**
     * Add child properties based on path if they're not presented.
     * @param obj
     * @param path
     */
    static instantiateObjectPath(obj: { [key: string]: any }, path: string): void {
        if (!ContextUtil.FIELD_PATH_REGEX.test(path)) {
            throw new Error(`Unable to instantiate child properties based on path "${path}". Path has invalid format.`);
        }

        const chunks = path.split('.');
        let subPath = '$';
        for (let i = 1; i < chunks.length; i++) {
            const name = chunks[i];
            let value = obj[name];
            subPath += '.' + name;

            if (value !== undefined && !isObject(value)) {
                throw new Error(
                    `Unable to instantiate child properties based on path "${path}". Sub-path "${subPath}" leads to non-object value.`,
                );
            }

            if (!value) {
                value = obj[name] = {};
            }
            obj = obj[name];
        }
    }

    /**
     * Get parent path of given one
     * @param path
     * @returns parent path relative to given one
     */
    static getParentPath(path: string): string {
        if (!ContextUtil.FIELD_PATH_REGEX.test(path)) {
            throw new Error(`Unable to get parent path of "${path}". Path has invalid format.`);
        }

        const chunks = path.split('.');
        chunks.pop();

        return chunks.join('.');
    }

    /**
     * Sanitize context from sensitive and unnecessary fields
     * @param {IContext} context
     * @return {IContextBase}
     */
    public static toBase(context: IContext): IContextBase {
        return {
            ctx: context.ctx,
            summary: context.summary,
            entities: context.entities,
        };
    }

    /**
     * Generate empty context
     * @return {IContext}
     */
    public static generateEmptyContext(): IContext {
        return <IContext>{
            cwd: process.cwd(),
            ctx: {},
            secrets: {},
            entities: {
                registered: [],
                unregistered: [],
                created: [],
                updated: [],
                deleted: [],
            },
            summary: [],
            dynamicActionHandlers: new ActionHandlersRegistry(),
            ejsTemplateDelimiters: {
                global: '$',
                local: '%',
            },
        };
    }

    /**
     * Resolve $ref:<target>.path references
     * @param options
     * @param context
     * @param parameters
     */
    public static resolveReferences(options: any, context: IContext, parameters: IDelegatedParameters): any {
        if (isMissing(options)) {
            return options;
        }

        if (isBasicType(options)) {
            // if options is string - check if it matches pattern
            if (typeof options === 'string') {
                const match = options.match(ContextUtil.REFERENCE_REGEX);
                if (match) {
                    let target: any;

                    /* istanbul ignore else */
                    if (match[1] === 'cwd') {
                        target = context.cwd;
                    } else if (match[1] === 'ctx') {
                        target = context.ctx;
                    } else if (match[1] === 'env') {
                        target = process.env;
                    } else if (match[1] === 'secrets') {
                        target = context.secrets;
                    } else if (match[1] === 'entities') {
                        target = context.entities;
                    } else if (match[1] === 'parameters') {
                        target = parameters.parameters;
                    } else if (match[1] === 'iteration') {
                        target = parameters.iteration;
                    }

                    if (match[2]) {
                        const chunks = match[2].substring(1).split('.');
                        for (const subPath of chunks) {
                            if (!isObject(target)) {
                                throw new Error(
                                    `Unable to find reference match for "$.${match[1]}${match[2]}". Non-object value found upon traveling the path at "${subPath}".`,
                                );
                            }

                            if (!target.hasOwnProperty(subPath)) {
                                throw new Error(
                                    `Unable to find reference match for "$.${match[1]}${match[2]}". Missing value found upon traveling the path at "${subPath}".`,
                                );
                            }

                            target = target[subPath];
                        }
                    }

                    return target;
                }

                return options;
            }

            // if not string - return it as is
            return options;
        }

        if (Array.isArray(options)) {
            return options.map(item => {
                return ContextUtil.resolveReferences(item, context, parameters);
            });
        }

        // resolve object field values
        const obj: any = {};
        for (const key of Object.keys(options)) {
            const resolvedKey = ContextUtil.resolveReferences(key, context, parameters);
            obj[resolvedKey] = ContextUtil.resolveReferences(options[key], context, parameters);
        }

        return obj;
    }
}
