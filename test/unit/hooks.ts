import * as colors from 'colors';
import Container from 'typedi';

import { TempPathsRegistry } from '../../src';

afterEach(async () => {
    await Container.get(TempPathsRegistry).cleanup();
    Container.reset();
});

before(() => {
    colors.enable();
    colors.disable();
});
