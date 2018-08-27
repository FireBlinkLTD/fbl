import {suite, test} from 'mocha-typescript';
import {ActionHandler} from '../../../src/models';
import {ActionHandlersRegistry} from '../../../src/services';
import * as assert from 'assert';
import {IActionHandlerMetadata} from '../../../src/interfaces';

const chai = require('chai');

class DummyActionHandler extends ActionHandler {
    constructor(
        private id: string
    ) {
        super();
    }

    getMetadata(): IActionHandlerMetadata {
        return  <IActionHandlerMetadata> {
            id: this.id,
            aliases: [
                this.id + '.1',
                this.id + '.2',
            ],
            version: '1.0.0'
        };
    }

    async execute(options: any, context: any): Promise<void> {
        return;
    }
}

@suite()
export class ActionHandlersRegistryTestSuite {
    @test()
    async lifecycle() {
        const registry = new ActionHandlersRegistry();
        const id1 = 'test1';
        const id2 = 'test2';
        const actionHandler1 = new DummyActionHandler(id1);
        const actionHandler2 = new DummyActionHandler(id2);

        registry.register(actionHandler1);
        registry.register(actionHandler2);

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
        chai.expect(() => {
            registry.find(id1);
        }).to.throw('Unable to find action handler for: ' + id1);

        // make sure action handler 1 can no longer be found by aliases
        chai.expect(() => {
            registry.find(id1 + '.1');
        }).to.throw('Unable to find action handler for: ' + id1 + '.1');

        chai.expect(() => {
            registry.find(id1 + '.2');
        }).to.throw('Unable to find action handler for: ' + id1 + '.2');

        // make sure action handler 2 can be found by id
        assert.strictEqual(actionHandler2, registry.find(id2));

        // make sure action handler 2 can be found by aliases
        assert.strictEqual(actionHandler2, registry.find(id2 + '.1'));
        assert.strictEqual(actionHandler2, registry.find(id2 + '.2'));
    }
}
