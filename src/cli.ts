#!/usr/bin/env node

import {CLIService} from './services';
import {Container} from 'typedi';

const cliService = Container.get(CLIService);

cliService.run().catch((e: Error) => {
    console.error(e.message);
    process.exit(1);
});
