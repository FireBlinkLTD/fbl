import { LogService } from '../services';
import { IContext } from '../interfaces';
import { IMetadata } from '../interfaces/IMetadata';
import { ContextUtil } from '../utils';
import { IDelegatedParameters } from '../interfaces/IDelegatedParameters';

const humanizeDuration = require('humanize-duration');
const deepObjectDiff = require('deep-object-diff');

export class ActionSnapshot {
    previousContextState: IContext;

    createdAt: Date;
    completedAt: Date;
    steps: IActionStep[];

    successful: boolean;
    errorCode: any;
    childFailure: boolean;
    ignoreChildFailure = false;
    duration = 0;

    constructor(
        public source: string,
        public idOrAlias: string,
        public metadata: IMetadata,
        public wd: string,
        public idx: number,
        public parameters: IDelegatedParameters,
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
     * @param {boolean} [error] indicated that log message is error
     * @param {boolean} [silent] if provided LogService will not be invoked
     */
    log(message: string, error = false, silent = false) {
        let prefix = ` -> [${this.idx}] [${this.source}] [${
            (this.metadata && this.metadata.$title) || this.idOrAlias
        }]`;

        if (error) {
            prefix = prefix.red;
        } else {
            prefix = prefix.green;
        }

        const logMessage = `${prefix} ${message}`;

        if (!silent) {
            if (error) {
                LogService.instance.error(logMessage);
            } else {
                LogService.instance.info(logMessage);
            }
        }

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
        this.registerStep('failure', {
            message: (error && error.message) || /* istanbul ignore next */ error.toString(),
            code: error && error.code,
        });
        this.completedAt = new Date();
        this.duration = this.completedAt.getTime() - this.createdAt.getTime();
        this.successful = false;

        if (error && error.code) {
            this.errorCode = error.code;
        }
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

    /**
     * Set initial context state before applying any actions
     * @param {IContext} context
     */
    setInitialContextState(context: IContext) {} // tslint:disable-line

    /**
     * Register step. Use this method only when other methods do not suite your needs.
     * @param {string} type
     * @param payload
     */
    registerStep(type: string, payload?: any) {} // tslint:disable-line

    /**
     * Register context
     * @param context
     */
    setContext(context: IContext) {} // tslint:disable-line

    /**
     * Register options
     * @param options
     */
    setOptions(options: any) {} // tslint:disable-line
}

export class EnabledActionSnapshot extends ActionSnapshot {
    constructor(
        source: string,
        idOrAlias: string,
        metadata: IMetadata,
        wd: string,
        idx: number,
        parameters: IDelegatedParameters,
    ) {
        super(source, idOrAlias, metadata, wd, idx, parameters);
    }

    /**
     * @inheritdoc
     */
    setInitialContextState(context: IContext) {
        this.previousContextState = JSON.parse(JSON.stringify(ContextUtil.toBase(context)));
    }

    /**
     * Register context
     * @inheritdoc
     */
    setContext(context: IContext) {
        // only selected fields should be exposed
        const newState = JSON.parse(JSON.stringify(ContextUtil.toBase(context)));

        // extract diff
        const diff = deepObjectDiff.detailedDiff(this.previousContextState, newState);
        this.previousContextState = newState;

        const changes =
            Object.keys(diff.added).length + Object.keys(diff.deleted).length + Object.keys(diff.updated).length;

        // store diff
        /* istanbul ignore else */
        if (changes > 0) {
            this.registerStep('context', diff);
        }
    }

    /**
     * @inheritdoc
     */
    setOptions(options: any) {
        this.registerStep('options', JSON.parse(JSON.stringify(options)));
    }

    /**
     * @inheritdoc
     */
    registerStep(type: string, payload?: any) {
        this.steps.push(<IActionStep>{
            type: type,
            createdAt: new Date(),
            payload: payload,
        });
    }
}

export interface IActionStep {
    type: string;
    createdAt: Date;
    payload?: any;
}
