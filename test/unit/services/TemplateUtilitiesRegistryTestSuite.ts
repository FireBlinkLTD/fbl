import {suite, test} from 'mocha-typescript';
import {TemplateUtilitiesRegistry} from '../../../src/services';
import {FSTemplateUtility} from '../../../src/plugins/templateUtilities/FSTemplateUtility';
import * as assert from 'assert';
import {HashTemplateUtility} from '../../../src/plugins/templateUtilities/HashTemplateUtility';

@suite()
class TemplateUtilitiesRegistryTestSuite {
    @test()
    async flow(): Promise<void> {
        const registry = new TemplateUtilitiesRegistry();
        const hashTemplateUtility = new HashTemplateUtility();
        const fsTemplateUtility = new FSTemplateUtility();

        registry.register(hashTemplateUtility, fsTemplateUtility);
        registry.unregister(fsTemplateUtility);

        const utils = registry.generateUtilities('.');

        assert(!utils.fs);
        assert(utils.hash);
    }
}
