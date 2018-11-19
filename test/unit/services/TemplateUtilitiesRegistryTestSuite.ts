import {suite, test} from 'mocha-typescript';
import {TemplateUtilitiesRegistry} from '../../../src/services';
import {EscapeTemplateUtility} from '../../../src/plugins/templateUtilities/EscapeTemplateUtility';
import {FSTemplateUtility} from '../../../src/plugins/templateUtilities/FSTemplateUtility';
import * as assert from 'assert';

@suite()
class TemplateUtilitiesRegistryTestSuite {
    @test()
    async flow(): Promise<void> {
        const registry = new TemplateUtilitiesRegistry();
        const escapeTemplateUtility = new EscapeTemplateUtility();
        const fsTemplateUtility = new FSTemplateUtility();

        registry.register(escapeTemplateUtility, fsTemplateUtility);
        registry.unregister(fsTemplateUtility);

        const utils = registry.generateUtilities('.');

        assert(!utils.fs);
        assert(utils.escape);
    }
}
