import {ActionHandler} from '../models';
import {Service} from 'typedi';

@Service()
export class ActionHandlersRegistry {
    private registry: {[name: string]: ActionHandler};
    private aliases: {[alias: string]: string};

    constructor() {
        this.registry = {};
        this.aliases = {};
    }

    /**
     * Register new entity
     * @param {ActionHandler} handler
     */
    public register(handler: ActionHandler) {
        const metadata = handler.getMetadata();

        this.registry[metadata.id] = handler;
        if (metadata.aliases) {
            metadata.aliases.forEach(alias => {
                this.aliases[alias] = metadata.id;
            });
        }
    }

    /**
     * Unregister handler by name
     * @param {string} id
     */
    public unregister(id: string) {
        delete this.registry[id];
        Object.keys(this.aliases).forEach(key => {
            if (this.aliases[key] === id) {
                delete this.aliases[key];
            }
        });
    }

    /**
     * Find action handler by id or alias
     * @param {string} idOrAlias
     */
    public find(idOrAlias: string): ActionHandler {
        let actionHandler = this.registry[idOrAlias];
        if (!actionHandler) {
            const id = this.aliases[idOrAlias];
            if (id) {
                actionHandler = this.registry[id];
            }
        }

        if (!actionHandler) {
            throw new Error(`Unable to find action handler for: ${idOrAlias}`);
        }

        return actionHandler;
    }
}
