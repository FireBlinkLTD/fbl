import { IIteration } from './IIteration';

export interface IDelegatedParameters {
    parameters?: { [key: string]: any };
    iteration?: IIteration;
}
