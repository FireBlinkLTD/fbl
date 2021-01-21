#!/usr/bin/env node

import { CLIService } from './services';

CLIService.instance.run().catch((e: Error) => {
    console.error((e && e.message) || /* istanbul ignore next */ e);
    process.exit(1);
});
