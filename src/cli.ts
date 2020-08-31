import { CLIService } from './services';
import { Container } from 'typedi';

const cliService = Container.get(CLIService);

cliService.run().catch((e: Error) => {
    console.error((e && e.message) || /* istanbul ignore next */ e);
    process.exit(1);
});
