#!/usr/bin/env node

import * as commander from 'commander';
import {FireBlinkLogistics} from './fbl';
import {ActionHandlersRegistry, FlowService} from './services';
import {Container} from 'typedi';
import {IContext, IPlugin} from './interfaces';
import {dirname, resolve} from 'path';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {dump} from 'js-yaml';
import * as colors from 'colors';

colors.enable();

const plugins: string[] = [
    './plugins/flow',
    './plugins/context',
    './plugins/files'
];

const defaultKeyValuePairs: string[] = [];

// prepare commander
commander
    .version(require('../../package.json').version)
    .option(
        '-p --plugin <file>',
        '[optional] Plugin file.',
        (val) => {
            plugins.push(resolve(val));
        }
    )
    .option(
        '-c --context <key=value>',
        [
            'Key value pair of default context values.',
            'Note if value is started with "@" it will be treated as YAML file and content will be loaded from it.'
        ].join(' '),
        (val) => {
            defaultKeyValuePairs.push(val);
        }
    )
    .option('-r --report <file>', 'Generate execution report in the end at given path.')
    .option('--no-colors', 'Remove colors from output. Make it boring.')
    .arguments('<file>')
    .action((file, options) => {
        options.file = file;
    });

// parse environment variables
commander.parse(process.argv);

if (!commander.file) {
    console.error('Error: flow descriptor file was not provided.');
    commander.outputHelp();
    process.exit(1);
}

if (!commander.colors) {
    colors.disable();
}

const fbl = Container.get<FireBlinkLogistics>(FireBlinkLogistics);
const flowService = Container.get<FlowService>(FlowService);
const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

plugins.forEach((path: string) => {
    const plugin: IPlugin = require(path);

    plugin.getActionHandlers().forEach(actionHander => {
        actionHandlersRegistry.register(actionHander);
    });
});

const run = async () => {
    const ctx: {[key: string]: any} = {};

    await Promise.all(defaultKeyValuePairs.map(async (kv: string): Promise<void> => {
        const chunks = kv.split('=');
        if (chunks.length !== 2) {
            throw new Error('Unable to extract key=value pair from: ' + kv);
        }

        if (chunks[1][0] === '@') {
            const file = chunks[1].substring(1);
            ctx[chunks[0]] = await flowService.readYamlFromFile(file);
        } else {
            ctx[chunks[0]] = chunks[1];
        }
    }));

    if (commander.report) {
        // enable debug mode when report generation is requested
        flowService.debug = true;
    }

    const flow = await flowService.readFlowFromFile(commander.file);
    const snapshot = await fbl.execute(dirname(commander.file), flow, <IContext> {
        ctx: ctx
    });

    if (commander.report) {
        await promisify(writeFile)(commander.report, dump(snapshot), 'utf8');
    }
};

run().catch((e: Error) => {
    console.error(e);
    process.exit(1);
});
