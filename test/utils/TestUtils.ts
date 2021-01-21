import {
    ActionHandlersRegistry,
    ChildProcessService,
    CLIService,
    FBLService,
    FlowService,
    LogService,
    TemplateUtilitiesRegistry,
    TempPathsRegistry,
} from '../../src';

const resetState = async () => {
    await TempPathsRegistry.instance.cleanup();

    ActionHandlersRegistry.reset();
    ChildProcessService.reset();
    CLIService.reset();
    FBLService.reset();
    FlowService.reset();
    LogService.reset();
    TemplateUtilitiesRegistry.reset();
    TempPathsRegistry.reset();
};

export { resetState };
