import {IContext, IContextBase, IDelegatedParameters} from '../interfaces';
import {ActionHandlersRegistry} from '../services/';
import {t} from 'tar';
import {ActionSnapshot} from '../models';

export class ContextUtil {
    private static OBJECT_PATH_REGEX = /^\$(\.[^.]+)*$/;
    private static FIELD_PATH_REGEX = /^\$\.[^.]+(\.[^.]+)*$/;

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

    static isMissing(value: any): boolean {
        return value === null || value === undefined;
    }

    /**
     * Assign value to paths
     * @param {IContext} context
     * @param {IDelegatedParameters} parameters
     * @param {ActionSnapshot} snapshot
     * @param {{ctx?: string; secrets?: string; parameters?: string}} paths
     * @param value
     * @return {Promise<void>}
     * @return {Promise<void>}
     */
    static async assignTo(context: IContext, parameters: IDelegatedParameters, snapshot: ActionSnapshot, paths: {ctx?: string, secrets?: string, parameters?: string}, value: any): Promise<void> {
        let contextChanged = false;

        /* istanbul ignore else */
        if (paths.ctx) {
            await ContextUtil.assignToField(context.ctx, paths.ctx, value);
            contextChanged = true;
        }

        /* istanbul ignore else */
        if (paths.secrets) {
            await ContextUtil.assignToField(context.secrets, paths.secrets, value);
            contextChanged = true;
        }

        /* istanbul ignore else */
        if (paths.parameters) {
            /* istanbul ignore else */
            if (!parameters.parameters) {
                parameters.parameters = {};
            }

            await ContextUtil.assignToField(parameters.parameters, paths.parameters, value);
        }

        /* istanbul ignore else */
        if (contextChanged) {
            snapshot.setContext(context);
        }
    }

    /**
     * Assign value to context's object
     * @param obj
     * @param {string} path
     * @param value
     * @param {boolean} [override]
     */
    static async assign(obj: {[key: string]: any}, path: string, value: any, override = false): Promise<void> {
        if (!ContextUtil.OBJECT_PATH_REGEX.test(path)) {
            throw new Error(`Unable to assign value to path ${path}. Path has invalid format.`);
        }

        const isAssignable = !ContextUtil.isBasicType(value) && !Array.isArray(value) && !ContextUtil.isMissing(value);

        const chunks = path.split('.');

        let target: any = obj;
        let parent = null;
        let key = null;

        let childPath = chunks[0];
        for (let i = 1; i < chunks.length; i++) {
            const isLast = i === chunks.length - 1;

            parent = target;
            key = chunks[i];

            childPath += '.' + chunks[i];
            const candidate = target[chunks[i]];
            if (ContextUtil.isMissing(candidate)) {
                target[chunks[i]] = {};
                target = target[chunks[i]];
            } else {
                if (!isLast || (isAssignable && typeof candidate !== 'object')) {
                    throw new Error(`Unable to assign path: ${path}. Sub-path ${childPath} leads to non-object value.`);
                }

                target = candidate;
            }
        }

        if (isAssignable) {
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
    static async assignToField(obj: {[key: string]: any}, path: string, value: any): Promise<void> {
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
