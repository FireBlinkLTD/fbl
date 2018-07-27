export interface IActionHandlerMetadata {
    /**
     * Action ID
     */
    id: string;

    /**
     * Human readable description
     */
    description?: string;

    /**
     * Optional YAML string formatted examples
     */
    examples?: string[];

    /**
     * Aliases that can be used to reference action handler instead of using long ID
     */
    aliases?: string[];

    /**
     * Version of action handler
     */
    version: string;

    /**
     * If provided options will not be treated as EJS template and as a result won't be resolved
     */
    skipTemplateProcessing?: boolean;

    /**
     * If provided entire options object will be considered as a sensitive information and will be masked in report.
     */
    considerOptionsAsSecrets?: boolean;
}
