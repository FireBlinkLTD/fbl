export interface IFlow {
    version?: string;
    requires?: {
        fbl?: string;
        plugins?: { [name: string]: string };
        applications?: string[];
    };
    description?: string;
    pipeline: any;
}
