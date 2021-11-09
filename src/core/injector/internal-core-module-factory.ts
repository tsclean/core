import {ModuleCompiler} from './compiler';
import {ContainerIoC} from './container';
import {DependenciesScanner} from '../../app';
import {InternalCoreModule} from './internal-core-module';
import {ModulesContainer} from './modules-container';
import {HttpAdapterHost, ExternalContextCreator} from "../../helpers";

export class InternalCoreModuleFactory {

    static create(container: ContainerIoC,
                  scanner: DependenciesScanner,
                  moduleCompiler: ModuleCompiler,
                  httpAdapterHost: HttpAdapterHost) {

        return InternalCoreModule.register([
            {
                provide: ExternalContextCreator,
                useValue: ExternalContextCreator.fromContainer(container),
            },
            {
                provide: ModulesContainer,
                useValue: container.getModules(),
            },
            {
                provide: HttpAdapterHost,
                useValue: httpAdapterHost,
            },
            {
                provide: HttpAdapterHost.name,
                useExisting: HttpAdapterHost,
            }
        ]);
    }
}
