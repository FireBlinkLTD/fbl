import {suite, test} from 'mocha-typescript';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {Container} from 'typedi';
import {FlowService, TempPathsRegistry} from '../../../src/services';
import * as assert from 'assert';
import {ContextUtil} from '../../../src/utils';
import {IFlowLocationOptions} from '../../../src/interfaces';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class FlowServiceTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failOnResolvingFlowWithJustRelativePath(): Promise<void> {
        const flowService = Container.get(FlowService);

        await chai.expect(
            flowService.resolveFlow(<IFlowLocationOptions> {
                path: 'a/b'
            })
        ).to.be.rejectedWith(
            'Provided path a/b is not absolute.'
        );
    }

    @test()
    async resolveTemplate(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const tpl = [
            'version: 1.0.0',
            'pipeline:',
            '  \'--\':',
            '    <$ [1,2,3].forEach((i) => { $>',
            '    - ctx:',
            '       g_<$- i $>:',
            '         inline: <$- ctx.test $><$- i $><%- ctx.test %>',
            '    <$ }) $>',
            '    - ctx:',
            '       l_1:',
            '         inline: <%- ctx.test %>'
        ].join('\n');

        // create temp file
        const file = await tempPathsRegistry.createTempFile();
        // write template to file
        await promisify(writeFile)(file, tpl, 'utf8');

        // generate context
        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = 'tst';

        const flowService = Container.get(FlowService);
        let resolved = flowService.resolveTemplate(
            context.ejsTemplateDelimiters.global,
            '.',
            tpl,
            context,
            {}
        );

        assert.strictEqual(resolved, [
            'version: 1.0.0',
            'pipeline:',
            '  \'--\':',
            '    ',
            '    - ctx:',
            '       g_1:',
            '         inline: tst1<%- ctx.test %>',
            '    ',
            '    - ctx:',
            '       g_2:',
            '         inline: tst2<%- ctx.test %>',
            '    ',
            '    - ctx:',
            '       g_3:',
            '         inline: tst3<%- ctx.test %>',
            '    ',
            '    - ctx:',
            '       l_1:',
            '         inline: <%- ctx.test %>'
        ].join('\n'));

        // test local delimiter
        context.ctx.test = 'new';
        resolved = flowService.resolveTemplate(
            context.ejsTemplateDelimiters.local,
            '.',
            resolved,
            context,
            {}
        );

        assert.strictEqual(resolved, [
            'version: 1.0.0',
            'pipeline:',
            '  \'--\':',
            '    ',
            '    - ctx:',
            '       g_1:',
            '         inline: tst1new',
            '    ',
            '    - ctx:',
            '       g_2:',
            '         inline: tst2new',
            '    ',
            '    - ctx:',
            '       g_3:',
            '         inline: tst3new',
            '    ',
            '    - ctx:',
            '       l_1:',
            '         inline: new'
        ].join('\n'));
    }
}
