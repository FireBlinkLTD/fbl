export interface IFlow {
    version?: string;
    requires?: {
        fbl?: string;
        plugins?: string[];
        applications?: string[];
    };
    description?: string;
    pipeline: any;
}
