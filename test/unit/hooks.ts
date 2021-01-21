import * as colors from 'colors';

import { resetState } from '../utils/TestUtils';

afterEach(async () => {
    await resetState();
});

before(() => {
    colors.enable();
    colors.disable();
});
