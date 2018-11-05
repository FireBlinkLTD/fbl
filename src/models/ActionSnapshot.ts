import {Container} from 'typedi';
import {FlowService} from '../services';
import {IContext} from '../interfaces';
import {IMetadata} from '../interfaces/IMetadata';
import {ContextUtil} from '../utils';
import {IDelegatedParameters} from '../interfaces/IDelegatedParameters';

const humanizeDuration = require('humanize-duration');
const deepObjectDiff = require('deep-object-diff');

export class ActionSnapshot {
    private previousContextState: IContext;

    private createdAt: Date;
    private completedAt: Date;
    private steps: IActionStep[];

    public successful: boolean;
    public childFailure: boolean;
    public ignoreChildFailure = false;
    public duration = 0;

    constructor(
        public idOrAlias: string,
        public metadata: IMetadata,
        public wd: string,
        public idx: number,
        public parameters: IDelegatedParameters
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
        console.log(` -> [${this.idx}] [${(this.metadata && this.metadata.$title) || this.idOrAlias}]`.green + ' ' + message);

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
     * Set initial context state before applying any actions
     * @param {IContext} context
     */
    setInitialContextState(context: IContext) {
        if (Container.get(FlowService).debug) {
            this.previousContextState = JSON.parse(JSON.stringify(ContextUtil.toBase(context)));
        }
    }

    /**
     * Register context
     * @param context
     */
    setContext(context: IContext) {
        if (Container.get(FlowService).debug) {
            // only selected fields should be exposed
            const newState = JSON.parse(JSON.stringify(ContextUtil.toBase(context)));

            // extract diff
            const diff = deepObjectDiff.detailedDiff(this.previousContextState, newState);
            this.previousContextState = newState;

            const changes = Object.keys(diff.added).length +
                Object.keys(diff.deleted).length +
                Object.keys(diff.updated).length;

            // store diff
            if (changes > 0) {
                this.registerStep('context', diff);
            }
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
    }

    /**
     * Record when validation passed
     */
    validated() {
        this.registerStep('validated');
    }

    /**
     * Record successful execution state
     */
    success() {
        this.registerStep('success');
        this.completedAt = new Date();
        this.duration = this.completedAt.getTime() - this.createdAt.getTime();
        this.successful = this.ignoreChildFailure || !this.childFailure;

    }

    /**
     * Record when skipped execution
     */
    skipped() {
        this.registerStep('skipped');
        this.successful = this.ignoreChildFailure || !this.childFailure;
        this.completedAt = new Date();
        this.duration = this.completedAt.getTime() - this.createdAt.getTime();
    }

    /**
     * Record when execution failed with error
     * @param error
     */
    failure(error: any) {
        this.registerStep('failure', error && error.toString());
        this.completedAt = new Date();
        this.duration = this.completedAt.getTime() - this.createdAt.getTime();
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
