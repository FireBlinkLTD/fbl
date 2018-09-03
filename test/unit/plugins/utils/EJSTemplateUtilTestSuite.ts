import {suite} from 'mocha-typescript';
import {EJSTemplateUtil} from '../../../../src/utils/EJSTemplateUtil';
import * as assert from 'assert';

@suite()
class EJSTemplateUtilTestSuite {
    @test()
    async getAbsolutePath(): Promise<void> {
        const wd = '/tmp';
        const util = new EJSTemplateUtil(wd);

        assert(util.getAbsolutePath('./test'), '/tmp/test');
    }
}
