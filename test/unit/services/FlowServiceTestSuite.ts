import { suite, test } from 'mocha-typescript';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { FlowService, TempPathsRegistry } from '../../../src/services';
import * as assert from 'assert';
import { ContextUtil } from '../../../src/utils';
import { IFlowLocationOptions } from '../../../src/interfaces';
import { ActionSnapshot } from '../../../src';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class FlowServiceTestSuite {
    @test()
    async failOnResolvingFlowWithJustRelativePath(): Promise<void> {
        const flowService = FlowService.instance;

        await chai
            .expect(
                flowService.resolveFlow(<IFlowLocationOptions>{
                    path: 'a/b',
                }),
            )
            .to.be.rejectedWith('Provided path a/b is not absolute.');
    }

    @test()
    async resolveTemplate(): Promise<void> {
        const tempPathsRegistry = TempPathsRegistry.instance;

        const tpl = [
            'version: 1.0.0',
            'pipeline:',
            "  '--':",
            '    <$ [1,2,3].forEach((i) => { $>',
            '    - ctx:',
            '       g_<$- i $>:',
            '         inline: <$- ctx.test $><$- i $><%- ctx.test %>',
            '    <$ }) $>',
            '    - ctx:',
            '       l_1:',
            '         inline: <%- ctx.test %>',
            '       l_2:',
            "         inline: <%- ctx['test'] %>",
        ].join('\n');

        // create temp file
        const file = await tempPathsRegistry.createTempFile();
        // write template to file
        await promisify(writeFile)(file, tpl, 'utf8');

        // generate context
        const context = ContextUtil.generateEmptyContext();
        context.ctx.test = 'tst';

        const snapshot = new ActionSnapshot('.', '', {}, '.', 0, {});

        const flowService = FlowService.instance;
        let resolved = await flowService.resolveTemplate(
            context.ejsTemplateDelimiters.global,
            tpl,
            context,
            snapshot,
            {},
        );

        assert.strictEqual(
            resolved,
            [
                'version: 1.0.0',
                'pipeline:',
                "  '--':",
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
                '         inline: <%- ctx.test %>',
                '       l_2:',
                "         inline: <%- ctx['test'] %>",
            ].join('\n'),
        );

        // test local delimiter
        context.ctx.test = 'new';
        resolved = await flowService.resolveTemplate(
            context.ejsTemplateDelimiters.local,
            resolved,
            context,
            snapshot,
            {},
        );

        assert.strictEqual(
            resolved,
            [
                'version: 1.0.0',
                'pipeline:',
                "  '--':",
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
                '         inline: new',
                '       l_2:',
                '         inline: new',
            ].join('\n'),
        );
    }
}
