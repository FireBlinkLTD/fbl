import { ActionProcessor } from '../../models';
import { IDelegatedParameters, IIteration } from '../../interfaces';

export abstract class BaseFlowActionProcessor extends ActionProcessor {
    /**
     * Get parameters for single iteration
     * @param shareParameters
     * @param iteration
     */
    protected getParameters(shareParameters: boolean, iteration: IIteration): any {
        const result = <IDelegatedParameters>{
            iteration: iteration,
        };

        if (this.parameters && this.parameters.parameters !== undefined) {
            result.parameters = shareParameters
                ? this.parameters.parameters
                : JSON.parse(JSON.stringify(this.parameters.parameters));
        }

        return result;
    }
}
