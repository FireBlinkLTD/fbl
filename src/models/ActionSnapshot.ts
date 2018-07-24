import {Container} from 'typedi';
import {FlowService} from '../services';
import {IContext} from '../interfaces';

const humanizeDuration = require('humanize-duration');

export class ActionSnapshot {
    private createdAt: Date;
    private steps: IActionStep[];

    public successful: boolean;
    public childFailure: boolean;
    public duration = 0;

    constructor(
        public idOrAlias: string,
        public wd: string,
        public idx: number
    ) {
        this.createdAt = new Date();
        this.steps = [];
        this.successful = false;
        this.childFailure = false;
    }

    /**
     * Get human readable duration
     * @return {string}
     */
    getHumanReadableDuration(): string {
        return humanizeDuration(this.duration);
    }

    /**
     * Register log message
     * @param {string} message
     */
    log(message: string) {
        console.log(` -> [${this.idx}] [${this.idOrAlias}]`.green + ' ' + message);

        this.registerStep('log', message);
    }

    /**
     * Set ID of the action handler
     * @param {string} id
     */
    setActionHandlerId(id: string) {
        this.registerStep('actionHandler', id);
    }

    /**
     * Register context
     * @param context
     */
    setContext(context: IContext) {
        if (Container.get(FlowService).debug) {
            // only ctx field should be exposed
            this.registerStep('context', JSON.parse(JSON.stringify({
                ctx: context.ctx
            })));
        }
    }

    /**
     * Register options
     * @param options
     */
    setOptions(options: any) {
        if (Container.get(FlowService).debug && options) {
            this.registerStep('options', JSON.parse(JSON.stringify(options)));
        }
    }

    /**
     * Register step. Use this method only when other methods do not suite your needs.
     * @param {string} type
     * @param payload
     */
    registerStep(type: string, payload?: any) {
        if (Container.get(FlowService).debug) {
            this.steps.push(<IActionStep> {
                type: type,
                createdAt: new Date(),
                payload: payload
            });
        }
    }

    /**
     * Record start of the processing
     */
    start() {
        this.registerStep('start');
        this.duration = Date.now() - this.createdAt.getTime();
    }

    /**
     * Record successful execution state
     */
    success() {
        this.registerStep('success');

        this.successful = !this.childFailure;
    }

    /**
     * Record when validation passed
     */
    validated() {
        this.registerStep('validated');
    }

    /**
     * Record when skipped execution
     */
    skipped() {
        this.registerStep('skipped');

        this.successful = !this.childFailure;
        this.duration = Date.now() - this.createdAt.getTime();
    }

    /**
     * Record when execution failed with error
     * @param error
     */
    failure(error: any) {
        this.registerStep('failure', error && error.toString());

        this.duration = Date.now() - this.createdAt.getTime();
    }

    /**
     * Register child ActionSnapshot
     * @param {ActionSnapshot} snapshot
     */
    registerChildActionSnapshot(snapshot: ActionSnapshot) {
        this.registerStep('child', snapshot);

        if (!snapshot.successful) {
            this.childFailure = true;
        }
    }

    /**
     * Get all the recorded steps
     * @return {IActionStep[]}
     */
    public getSteps(): IActionStep[] {
        return this.steps;
    }
}

export interface IActionStep {
    type: string;
    createdAt: Date;
    payload?: any;
}
