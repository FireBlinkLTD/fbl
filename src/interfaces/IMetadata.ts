export interface IMetadata {
    /**
     * Custom action title
     */
    $title?: string;
    
    /**
     * Additional parameters to merge
     */
    $parameters?: {[key: string]: any};

    /**
     * Any other fields that are not nativelly used by FBL Core.
     */
    [key: string]: any;
}
