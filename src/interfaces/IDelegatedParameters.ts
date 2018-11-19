import {IIteration} from './IIteration';

export interface IDelegatedParameters {
    wd?: string;
    parameters?: {[key: string]: any};
    iteration?: IIteration;
}
