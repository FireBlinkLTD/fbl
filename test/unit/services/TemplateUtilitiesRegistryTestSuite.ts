import { suite, test } from 'mocha-typescript';
import { TemplateUtilitiesRegistry } from '../../../src/services';
import { FSTemplateUtility } from '../../../src/plugins/templateUtilities/FSTemplateUtility';
import * as assert from 'assert';
import { HashTemplateUtility } from '../../../src/plugins/templateUtilities/HashTemplateUtility';
import { ContextUtil, ActionSnapshot } from '../../../src';

@suite()
class TemplateUtilitiesRegistryTestSuite {
    @test()
    async flow(): Promise<void> {
        const hashTemplateUtility = new HashTemplateUtility();
        const fsTemplateUtility = new FSTemplateUtility();

        TemplateUtilitiesRegistry.instance.register(hashTemplateUtility, fsTemplateUtility);
        TemplateUtilitiesRegistry.instance.unregister(fsTemplateUtility);

        const utils = TemplateUtilitiesRegistry.instance.generateUtilities(
            ContextUtil.generateEmptyContext(),
            new ActionSnapshot('.', '', {}, '.', 0, {}),
            {},
            '.',
        );

        assert(!utils.fs);
        assert(utils.hash);
    }
}
