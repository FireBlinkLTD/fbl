import { ITemplateUtility, IContext, IDelegatedParameters, IAssignTo, IPushTo } from '../../interfaces';
import { ContextUtil } from '../../utils';
import { ActionSnapshot } from '../../models';

const STRING_TYPE = {
    type: 'string',
    pattern: '^\\$\\.(ctx|secrets|parameters)\\.[^.]+(\\.[^.]+)*$',
};

const FIELD_TYPE = {
    type: 'string',
    pattern: '^\\$\\.[^.]+(\\.[^.]+)*$',
};

export class ContextTemplateUtility implements ITemplateUtility {
    /**
     * @inheritdoc
     */
    getUtilities(
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): { [key: string]: any } {
        return {
            assignToSchema(): any {
                return {
                    anyOf: [
                        STRING_TYPE,
                        {
                            type: 'object',
                            properties: {
                                ctx: FIELD_TYPE,
                                secrets: FIELD_TYPE,
                                parameters: FIELD_TYPE,
                                override: {
                                    type: 'boolean',
                                },
                            },
                        },
                    ],
                };
            },

            assignTo(paths: IAssignTo | string, value: any): void {
                ContextUtil.assignTo(context, parameters, snapshot, paths, value);
            },

            pushToSchema(): any {
                return {
                    anyOf: [
                        STRING_TYPE,
                        {
                            type: 'object',
                            properties: {
                                ctx: FIELD_TYPE,
                                secrets: FIELD_TYPE,
                                parameters: FIELD_TYPE,
                                override: {
                                    type: 'boolean',
                                },
                                children: {
                                    type: 'boolean',
                                },
                            },
                        },
                    ],
                };
            },

            pushTo(paths: IPushTo | string, value: any): void {
                ContextUtil.pushTo(context, parameters, snapshot, paths, value);
            },
        };
    }
}
