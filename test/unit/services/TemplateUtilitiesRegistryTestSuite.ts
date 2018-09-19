import {suite, test} from 'mocha-typescript';
import {TemplateUtilitiesRegistry} from '../../../src/services';
import {ToJSONTemplateUtility} from '../../../src/plugins/templateUtilities/ToJSONTemplateUtility';
import {FSTemplateUtility} from '../../../src/plugins/templateUtilities/FSTemplateUtility';
import * as assert from 'assert';

@suite()
class TemplateUtilitiesRegistryTestSuite {
    @test()
    async flow(): Promise<void> {
        const registry = new TemplateUtilitiesRegistry();
        const toJsonTemplateUtility = new ToJSONTemplateUtility();
        const fsTemplateUtility = new FSTemplateUtility();

        registry.register(toJsonTemplateUtility, fsTemplateUtility);
        registry.unregister(fsTemplateUtility);

        const utils = registry.generateUtilities('.');

        assert(!utils.fs);
        assert(utils.toJSON);
    }
}
