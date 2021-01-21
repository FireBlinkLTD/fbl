import { ActionHandler, ActionSnapshot } from '../models';
import { FBLService } from './FBLService';
import { IPlugin } from '../interfaces';
import { LogService } from './LogService';

export class ActionHandlersRegistry {
    constructor() {
        this.cleanup();
    }

    private static pInstance: ActionHandlersRegistry;
    public static get instance(): ActionHandlersRegistry {
        if (!this.pInstance) {
            this.pInstance = new ActionHandlersRegistry();
        }

        return this.pInstance;
    }

    public static reset() {
        this.pInstance = null;
    }

    private registry: { [name: string]: ActionHandler };
    private aliases: { [alias: string]: string };

    /**
     * Register new action handler
     * @param {ActionHandler} handler
     * @param {IPlugin} plugin
     * @param {ActionSnapshot} [snapshot]
     * @return self instance
     */
    public register(handler: ActionHandler, plugin: IPlugin, snapshot?: ActionSnapshot): ActionHandlersRegistry {
        if (handler.getMetadata().aliases) {
            for (const alias of handler.getMetadata().aliases) {
                if (alias.startsWith(FBLService.METADATA_PREFIX)) {
                    throw new Error(
                        `Unable to register action handler with alias "${alias}". It can not start with ${FBLService.METADATA_PREFIX}`,
                    );
                }
            }
        }

        if (handler.getMetadata().id.startsWith(FBLService.METADATA_PREFIX)) {
            throw new Error(
                `Unable to register action handler with id "${handler.getMetadata().id}". It can not start with ${
                    FBLService.METADATA_PREFIX
                }`,
            );
        }

        const metadata = handler.getMetadata();

        if (this.registry[metadata.id]) {
            if (snapshot) {
                snapshot.log(
                    `Action handler with id ${metadata.id} was overridden by plugin ${plugin.name}@${plugin.version}`,
                    true,
                );
            } else {
                LogService.instance.error(
                    ' -> Warning'.red +
                        ' action handler with id: ' +
                        metadata.id.red +
                        ' was overridden by plugin ' +
                        `${plugin.name}@${plugin.version}`.red,
                );
            }
        }

        this.registry[metadata.id] = handler;
        if (metadata.aliases) {
            metadata.aliases.forEach((alias) => {
                if (this.aliases[alias]) {
                    /* istanbul ignore else */
                    if (snapshot) {
                        snapshot.log(
                            `Action handler with alias ${alias} was overridden by plugin ${plugin.name}@${plugin.version}`,
                            true,
                        );
                    } else {
                        LogService.instance.error(
                            ' -> Warning'.red +
                                ' action handler with alias: ' +
                                alias.red +
                                ' was overridden by plugin ' +
                                `${plugin.name}@${plugin.version}`.red,
                        );
                    }
                }
                this.aliases[alias] = metadata.id;
            });
        }

        return this;
    }

    /**
     * Unregister handler by name
     * @param {string} id
     * @return self instance
     */
    public unregister(id: string): ActionHandlersRegistry {
        delete this.registry[id];
        Object.keys(this.aliases).forEach((key) => {
            if (this.aliases[key] === id) {
                delete this.aliases[key];
            }
        });

        return this;
    }

    public cleanup(): ActionHandlersRegistry {
        this.registry = {};
        this.aliases = {};

        return this;
    }

    /**
     * Find action handler by id or alias
     * @param {string} idOrAlias
     */
    public find(idOrAlias: string): ActionHandler | null {
        let actionHandler = this.registry[idOrAlias];
        if (!actionHandler) {
            const id = this.aliases[idOrAlias];
            if (id) {
                actionHandler = this.registry[id];
            }
        }

        if (!actionHandler) {
            return null;
        }

        return actionHandler;
    }
}
