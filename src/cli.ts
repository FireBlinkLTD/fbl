#!/usr/bin/env node

import * as commander from 'commander';
import {FireBlinkLogistics} from './fbl';
import {ActionHandlersRegistry, FlowService} from './services';
import {Container} from 'typedi';
import {IPlugin} from './interfaces';
import {dirname} from 'path';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {dump} from 'js-yaml';
import * as colors from 'colors';

const requireg = require('requireg');

colors.enable();

const plugins: string[] = [
    __dirname + '/plugins/flow',
    __dirname + '/plugins/context',
    __dirname + '/plugins/files'
];

const configKVPairs: string[] = [];
const secretKVPairs: string[] = [];

// prepare commander
commander
    .version(require('../../package.json').version)
    .option(
        '-p --plugin <file>',
        '[optional] Plugin file.',
        (val) => {
            plugins.push(val);
        }
    )
    .option(
        '-c --context <key=value>',
        [
            'Key value pair of default context values.',
            'Note: if value is started with "@" it will be treated as YAML file and content will be loaded from it.'
        ].join(' '),
        (val) => {
            configKVPairs.push(val);
        }
    )
    .option(
        '-s --secret <key=value|name>',
        [
            'Key value pair of default secret values. Secrets will not be available in report.',
            'Note: if value is started with "@" it will be treated as YAML file and content will be loaded from it.'
        ].join(' '),
        (val) => {
            secretKVPairs.push(val);
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

const convertKVPairs = async (pairs: string[]): Promise<{[key: string]: any}> => {
    const result: {[key: string]: any} = {};

    await Promise.all(pairs.map(async (kv: string): Promise<void> => {
        const chunks = kv.split('=');
        if (chunks.length !== 2) {
            throw new Error('Unable to extract key=value pair from: ' + kv);
        }

        if (chunks[1][0] === '@') {
            const file = chunks[1].substring(1);
            result[chunks[0]] = await flowService.readYamlFromFile(file);
        } else {
            result[chunks[0]] = chunks[1];
        }
    }));

    return result;
};

const run = async () => {
    // register plugins
    plugins.forEach((path: string) => {
        const plugin: IPlugin = requireg(path);

        plugin.getActionHandlers().forEach(actionHander => {
            actionHandlersRegistry.register(actionHander);
        });
    });

    const context = FlowService.generateEmptyContext();
    context.ctx = await convertKVPairs(configKVPairs);
    context.secrets = await convertKVPairs(secretKVPairs);
    
    if (commander.report) {
        // enable debug mode when report generation is requested
        flowService.debug = true;
    }

    const flow = await flowService.readFlowFromFile(commander.file);
    const snapshot = await fbl.execute(dirname(commander.file), flow, context);

    if (commander.report) {
        await promisify(writeFile)(commander.report, dump(snapshot), 'utf8');
    }

    if (!snapshot.successful) {
        throw new Error('Execution failed.');
    }
};

run().catch((e: Error) => {
    console.error(e.message);
    process.exit(1);
});
