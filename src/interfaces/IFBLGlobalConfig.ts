export interface IFBLGlobalConfig {
    plugins?: string[];
    context?: {
        ctx?: { [key: string]: any };
        secrets?: { [key: string]: any };
        parameters?: { [key: string]: any };
    };

    report?: {
        output?: string;
        type?: string;
        options?: { [key: string]: string };
    };
    http?: {
        headers?: { [key: string]: string };
    };
    other?: {
        allowUnsafePlugins?: boolean;
        allowUnsafeFlows?: boolean;
        useCache?: boolean;
        noColors?: boolean;
        globalTemplateDelimiter?: string;
        localTemplateDelimiter?: string;
    };
}
