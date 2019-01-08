import { IContextBase } from './IContext';
import { ActionSnapshot } from '../models';

export interface IReport {
    context: {
        initial: IContextBase;
        final: IContextBase;
    };
    snapshot: ActionSnapshot;
}
