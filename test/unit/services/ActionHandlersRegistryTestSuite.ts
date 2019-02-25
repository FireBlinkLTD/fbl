import { suite, test } from 'mocha-typescript';
import { ActionHandler, EnabledActionSnapshot } from '../../../src/models';
import { ActionHandlersRegistry } from '../../../src/services';
import * as assert from 'assert';
import { IActionHandlerMetadata, IPlugin } from '../../../src/interfaces';
import { Container } from 'typedi';

const chai = require('chai');

class DummyActionHandler extends ActionHandler {
    constructor(private id: string) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return <IActionHandlerMetadata>{
            id: this.id,
            aliases: [this.id + '.1', this.id + '.2'],
            version: '1.0.0',
        };
    }

    async execute(options: any, context: any): Promise<void> {
        return;
    }
}

@suite()
export class ActionHandlersRegistryTestSuite {
    after() {
        Container.reset();
    }

    @test()
    async lifecycle() {
        const registry = new ActionHandlersRegistry();
        const id1 = 'test1';
        const id2 = 'test2';
        const actionHandler1 = new DummyActionHandler(id1);
        const actionHandler2 = new DummyActionHandler(id2);

        const plugin: IPlugin = {
            name: 'test',
            version: '1.0.0',
            requires: {
                fbl: '>=0.0.0',
            },
        };

        registry.register(actionHandler1, plugin);
        registry.register(actionHandler2, plugin);

        // make sure action handlers can be found their ids
        assert.strictEqual(actionHandler1, registry.find(id1));
        assert.strictEqual(actionHandler2, registry.find(id2));

        // make sure action handlers can be found by their aliases
        assert.strictEqual(actionHandler1, registry.find(id1 + '.1'));
        assert.strictEqual(actionHandler1, registry.find(id1 + '.2'));

        assert.strictEqual(actionHandler2, registry.find(id2 + '.1'));
        assert.strictEqual(actionHandler2, registry.find(id2 + '.2'));

        registry.unregister(id1);

        // make sure action handler 1 can no longer be found by id
        assert.strictEqual(registry.find(id1), null);
        assert.strictEqual(registry.find(id1 + '.1'), null);
        assert.strictEqual(registry.find(id1 + '.2'), null);

        // make sure action handler 2 can be found by id
        assert.strictEqual(actionHandler2, registry.find(id2));

        // make sure action handler 2 can be found by aliases
        assert.strictEqual(actionHandler2, registry.find(id2 + '.1'));
        assert.strictEqual(actionHandler2, registry.find(id2 + '.2'));

        // make sure override logs are created
        const snapshot = new EnabledActionSnapshot('id', {}, '.', 0, {});
        registry.register(actionHandler2, plugin, snapshot);

        const logs = snapshot.getSteps().filter(step => step.type === 'log');
        assert.strictEqual(
            logs[0].payload,
            `Action handler with id ${actionHandler2.getMetadata().id} was overridden by plugin ${plugin.name}@${
                plugin.version
            }`,
        );
        assert.strictEqual(
            logs[1].payload,
            `Action handler with alias ${actionHandler2.getMetadata().aliases[0]} was overridden by plugin ${
                plugin.name
            }@${plugin.version}`,
        );
    }
}
