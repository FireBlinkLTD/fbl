import {ActionHandler} from '../models';
import {Service} from 'typedi';
import {FBLService} from './FBLService';

@Service()
export class ActionHandlersRegistry {
    private registry: {[name: string]: ActionHandler};
    private aliases: {[alias: string]: string};

    constructor() {
        this.cleanup();
    }

    /**
     * Register new entity
     * @param {ActionHandler} handler
     * @return self instance
     */
    public register(handler: ActionHandler): ActionHandlersRegistry {
        if (handler.getMetadata().aliases) {
            for (const alias of handler.getMetadata().aliases) {
                if (alias.startsWith(FBLService.METADATA_PREFIX)) {
                    throw new Error(`Unable to register action handler with alias "${alias}". It can not start with ${FBLService.METADATA_PREFIX}`);
                }
            }
        }

        if (handler.getMetadata().id.startsWith(FBLService.METADATA_PREFIX)) {
            throw new Error(`Unable to register action handler with id "${handler.getMetadata().id}". It can not start with ${FBLService.METADATA_PREFIX}`);
        }

        const metadata = handler.getMetadata();

        this.registry[metadata.id] = handler;
        if (metadata.aliases) {
            metadata.aliases.forEach(alias => {
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
        Object.keys(this.aliases).forEach(key => {
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
