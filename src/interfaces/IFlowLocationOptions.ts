export interface IFlowLocationOptions {
    path: string;
    http?: {
        headers?: {[key: string]: string};
    };
    target?: string;
    cache?: boolean;
}
