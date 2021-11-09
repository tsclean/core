import {
    DynamicModuleInterface,
    ExistingProvider,
    FactoryProvider,
    ValueProvider
} from "../../contracts";
import {Reflector} from "../../services";
import {inquirerProvider} from './inquirer';
import {Global, Container} from "../../decorators";
import {requestProvider} from "../../router/request/request-providers";

const ReflectorAliasProvider = {
    provide: Reflector.name,
    useExisting: Reflector,
};

@Global()
@Container({
    providers: [
        Reflector,
        ReflectorAliasProvider,
        requestProvider,
        inquirerProvider,
    ],
    exports: [
        Reflector,
        ReflectorAliasProvider,
        requestProvider,
        inquirerProvider,
    ],
})
export class InternalCoreModule {
    static register(
        providers: Array<ValueProvider | FactoryProvider | ExistingProvider>,
    ): DynamicModuleInterface {
        return {
            module: InternalCoreModule,
            providers: [...providers],
            exports: [...providers.map(item => item.provide)],
        };
    }
}
