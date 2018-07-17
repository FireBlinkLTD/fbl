#!/usr/bin/env node

import * as commander from 'commander';
import {FireBlinkLogistics} from './fbl';
import {ActionHandlersRegistry, FlowService} from './services';
import {Container} from 'typedi';
import {IPlugin} from './interfaces';
import {resolve} from 'path';

// prepare commander
commander
    .version(require('../../package.json').version)
    .option('-p --plugin <file>', '[optional] Plugin file.', (val, list) => {
        list.push(val);

        return list;
    }, [])
    .arguments('<file>')
    .action((file, options) => {
        options.file = file;
    });

// parse environment variables
commander.parse(process.argv);

if (!commander.file) {
    console.error('Error: flow descriptor file was not provided.');
    process.exit(1);
}

const fbl = Container.get<FireBlinkLogistics>(FireBlinkLogistics);
const flowService = Container.get<FlowService>(FlowService);
const actionHandlersRegistry = Container.get<ActionHandlersRegistry>(ActionHandlersRegistry);

// register plugins (including default ones)
const plugins: string[] = [
    './plugins/flow',
    './plugins/context',
    './plugins/files'
];
plugins.push(...commander.plugin.map((p: string) => resolve(p)));

plugins.forEach((path: string) => {
    const plugin: IPlugin = require(path);

    plugin.getActionHandlers().forEach(actionHander => {
        actionHandlersRegistry.register(actionHander);
    });
});

const run = async () => {
    const flow = await flowService.readFlowFromFile(commander.args[0]);
    await fbl.execute(flow);
};

run().catch((e: Error) => {
    console.error(e);
    process.exit(1);
});
