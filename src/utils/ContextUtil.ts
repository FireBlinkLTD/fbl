import {IContext, IContextBase, IDelegatedParameters} from '../interfaces';
import {ActionHandlersRegistry} from '../services/';
import {t} from 'tar';
import {ActionSnapshot} from '../models';
import * as Joi from 'joi';
import {isObject} from 'util';

export class ContextUtil {
    private static OBJECT_PATH_REGEX = /^\$(\.[^.]+)*$/;
    private static FIELD_PATH_REGEX = /^\$\.[^.]+(\.[^.]+)*$/;

    /**
     * Check if value represents a basic type
     * @param value
     */
    static isBasicType(value: any): boolean {
        if (typeof value === 'number') {
            return true;
        }

        if (typeof value === 'string') {
            return true;
        }

        if (typeof value === 'boolean') {
            return true;
        }

        return false;
    }

    /**
     * Check if value is null or undefined
     * @param value
     */
    static isMissing(value: any): boolean {
        return value === null || value === undefined;
    }

    /**
     * Check if value is object
     * @param value
     */
    static isObject(value: any): boolean {
        const fileContentValidationResult = Joi.validate(value, Joi.object().required());

        return !fileContentValidationResult.error;
    }

    /**
     * Assign value based on paths
     * @param {IContext} context
     * @param {IDelegatedParameters} parameters
     * @param {ActionSnapshot} snapshot
     * @param {{ctx?: string; secrets?: string; parameters?: string}} paths
     * @param value
     * @param {boolean} override
     * @return {Promise<void>}
     * @return {Promise<void>}
     */
    static async assignTo(
        context: IContext,
        parameters: IDelegatedParameters,
        snapshot: ActionSnapshot,
        paths: {ctx?: string, secrets?: string, parameters?: string},
        value: any,
        override: boolean
    ): Promise<void> {
        /* istanbul ignore else */
        if (paths.ctx) {
            await ContextUtil.assignToField(context.ctx, paths.ctx, value, override);
            snapshot.setContext(context);
        }

        /* istanbul ignore else */
        if (paths.secrets) {
            await ContextUtil.assignToField(context.secrets, paths.secrets, value, override);
        }

        /* istanbul ignore else */
        if (paths.parameters) {
            /* istanbul ignore else */
            if (!parameters.parameters) {
                parameters.parameters = {};
            }

            await ContextUtil.assignToField(parameters.parameters, paths.parameters, value, override);
        }
    }

    /**
     * Push value based on paths
     * @param {IContext} context
     * @param {IDelegatedParameters} parameters
     * @param {ActionSnapshot} snapshot
     * @param {{ctx?: string; secrets?: string; parameters?: string}} paths
     * @param value
     * @param {boolean} children
     * @param {boolean} override
     * @return {Promise<void>}
     * @return {Promise<void>}
     */
    static async pushTo(
        context: IContext,
        parameters: IDelegatedParameters,
        snapshot: ActionSnapshot,
        paths: {ctx?: string, secrets?: string, parameters?: string},
        value: any,
        children: boolean,
        override: boolean
    ): Promise<void> {
        /* istanbul ignore else */
        if (paths.ctx) {
            await ContextUtil.push(context.ctx, paths.ctx, value, children, override);
            snapshot.setContext(context);
        }

        /* istanbul ignore else */
        if (paths.secrets) {
            await ContextUtil.push(context.secrets, paths.secrets, value, children, override);
        }

        /* istanbul ignore else */
        if (paths.parameters) {
            /* istanbul ignore else */
            if (!parameters.parameters) {
                parameters.parameters = {};
            }

            await ContextUtil.push(parameters.parameters, paths.parameters, value, override);
        }
    }

    /**
     * Push value or its child objects to obj by given path
     * @param {{[p: string]: any}} obj
     * @param {string} path
     * @param value
     * @param {boolean} children
     * @param {boolean} override
     * @return {Promise<void>}
     */
    static async push(
        obj: {[key: string]: any},
        path: string, value: any,
        children: boolean,
        override = false
    ): Promise<void> {
        if (!ContextUtil.OBJECT_PATH_REGEX.test(path)) {
            throw new Error(`Unable to push value to path ${path}. Path has invalid format.`);
        }

        const isArray = Array.isArray(value);
        if (!isArray && children) {
            throw new Error(`Unable to push child records of value to path ${path}. Value is not an array.`);
        }

        const searchResult = ContextUtil.findTargetByPath(obj, path, []);

        if (!Array.isArray(searchResult.target)) {
            throw new Error(`Unable to assign path: ${path}. Target is not array.`);
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
     * @param {{[p: string]: any}} obj
     * @param {string} path
     * @return {{target: any; parent: {[p: string]: any}; key: string; subPath: string}}
     */
    private static findTargetByPath(
        obj: {[key: string]: any}, path: string,
        leaf: any
    ): {target: any, parent: {[key: string]: any}, key: string} {
        const chunks = path.split('.');

        let target: any = obj;
        let parent: {[key: string]: any} = null;
        let key: string = null;

        let subPath = chunks[0];
        for (let i = 1; i < chunks.length; i++) {
            parent = target;
            key = chunks[i];
            subPath += '.' + key;

            const candidate = target[chunks[i]];
            const isLast = i === chunks.length - 1;
            if (ContextUtil.isMissing(candidate)) {
                target[chunks[i]] = isLast ? leaf : {};
                target = target[chunks[i]];
            } else {
                if (!isLast) {
                    if (!ContextUtil.isObject(candidate)) {
                        throw new Error(`Unable to assign path: ${path}. Sub-path ${subPath} leads to non-object value.`);
                    }
                }

                target = candidate;
            }
        }

        return {
            target,
            parent,
            key
        };
    }

    /**
     * Assign value to context's object
     * @param obj
     * @param {string} path
     * @param value
     * @param {boolean} [override]
     */
    static async assign(obj: {[key: string]: any}, path: string, value: any, override: boolean): Promise<void> {
        if (!ContextUtil.OBJECT_PATH_REGEX.test(path)) {
            throw new Error(`Unable to assign value to path ${path}. Path has invalid format.`);
        }

        const isAssignable = !ContextUtil.isBasicType(value) && !Array.isArray(value) && !ContextUtil.isMissing(value);

        const {target, parent, key} = ContextUtil.findTargetByPath(obj, path, {});

        if (isAssignable) {
            if (typeof target !== 'object') {
                throw new Error(`Unable to assign path: ${path}. Target is not an object.`);
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
                throw new Error('Unable to assign non-object value to root path');
            }

            parent[key] = value;
        }
    }

    /**
     * Assign value to context object's field
     * @param {object} obj
     * @param {string} path
     * @param value
     * @return {Promise<void>}
     */
    static async assignToField(obj: {[key: string]: any}, path: string, value: any, override: boolean): Promise<void> {
        if (!ContextUtil.FIELD_PATH_REGEX.test(path)) {
            throw new Error(`Unable to assign value to path "${path}". Path has invalid format.`);
        }

        const chunks = path.split('.');
        const fieldName = chunks[chunks.length - 1];
        const parentPath = path.substring(0, path.length - (fieldName.length + 1));

        await ContextUtil.assign(obj, parentPath, { [fieldName]: value }, false);
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
            entities: context.entities
        };
    }

    /**
     * Generate empty context
     * @return {IContext}
     */
    public static generateEmptyContext(): IContext {
        return <IContext> {
            cwd: process.cwd(),
            ctx: {},
            secrets: {},
            entities: {
                registered: [],
                unregistered: [],
                created: [],
                updated: [],
                deleted: []
            },
            summary: [],
            dynamicActionHandlers: new ActionHandlersRegistry(),
            ejsTemplateDelimiters: {
                global: '$',
                local: '%'
            }
        };
    }
}
