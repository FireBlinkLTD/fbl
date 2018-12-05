import {suite, test} from 'mocha-typescript';
import {UUIDTemplateUtility} from '../../../../src/plugins/templateUtilities/UUIDTemplateUtility';
import * as assert from 'assert';
import { ContextUtil, ActionSnapshot } from '../../../../src';

@suite()
class UUIDTemplateUtilityTestSuite {
    private UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    @test()
    async v4(): Promise<void> {
        const UUID = new UUIDTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('', {}, '.', 0, {}),
            {}
        ).UUID;
        assert(UUID);
        assert(UUID.v4);

        const uuid1 = UUID.v4();
        const uuid2 = UUID.v4();

        assert(uuid1 !== uuid2);
        assert(this.UUID_PATTERN.test(uuid1));
        assert(this.UUID_PATTERN.test(uuid2));
    }

    @test()
    async v5DNS(): Promise<void> {
        const UUID = new UUIDTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('', {}, '.', 0, {}),
            {}
        ).UUID;
        assert(UUID);
        assert(UUID.v5);
        assert(UUID.v5.DNS);

        const uuid1 = UUID.v5.DNS('fireblink.com');
        const uuid2 = UUID.v5.DNS('fireblink.com');

        assert.strictEqual(uuid1, uuid2);
        assert(this.UUID_PATTERN.test(uuid1));
    }

    @test()
    async v5URL(): Promise<void> {
        const UUID = new UUIDTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('', {}, '.', 0, {}),
            {}
        ).UUID;
        assert(UUID);
        assert(UUID.v5);
        assert(UUID.v5.URL);

        const uuid1 = UUID.v5.URL('https://fireblink.com');
        const uuid2 = UUID.v5.URL('https://fireblink.com');

        assert.strictEqual(uuid1, uuid2);
        assert(this.UUID_PATTERN.test(uuid1));
    }

    @test()
    async v5custom(): Promise<void> {
        const UUID = new UUIDTemplateUtility().getUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('', {}, '.', 0, {}),
            {}
        ).UUID;
        assert(UUID);
        assert(UUID.v5);
        assert(UUID.v5.custom);

        const seed1 = UUID.v4();
        const seed2 = UUID.v4();
        const uuid1 = UUID.v5.custom('test', seed1);
        const uuid2 = UUID.v5.custom('test', seed1);
        const uuid3 = UUID.v5.custom('test2', seed1);
        const uuid4 = UUID.v5.custom('test', seed2);

        assert.strictEqual(uuid1, uuid2);

        assert(uuid1 !== uuid3);
        assert(uuid1 !== uuid4);
        assert(uuid3 !== uuid4);

        assert(this.UUID_PATTERN.test(uuid1));
        assert(this.UUID_PATTERN.test(uuid3));
        assert(this.UUID_PATTERN.test(uuid4));
    }
}
