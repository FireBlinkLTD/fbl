import * as colors from 'colors';
import {setGracefulCleanup} from 'tmp';

before(() => {
    colors.enable();
});

after(() => {
    setGracefulCleanup();
});
