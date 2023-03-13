import {
    MULTER_MODULE_OPTIONS,
    MulterModuleAsyncOptions, MulterOptions,
    MulterOptionsFactory,
} from './interfaces';
import {MULTER_MODULE_ID} from './multer.constants';
import {Global, ModuleDecorator} from "../decorators";
import {ProviderType} from "../types";
import {
    DynamicModuleInterface,
    ExistingProvider,
    FactoryProvider,
    ValueProvider
} from "../contracts";
import {randomStringGenerator} from "../utils";
import {FileInterceptor} from "./interceptors";

let options: MulterOptions;

const MulterModuleOptionsProvider = {
    provide: MULTER_MODULE_OPTIONS,
    useValue: options
}

const MulterModuleIdProvider = {
    provide: MULTER_MODULE_ID,
    useValue: randomStringGenerator(),
}

@Global()
@ModuleDecorator({
    providers: [
        MulterModuleOptionsProvider,
        MulterModuleIdProvider
    ],
    exports: [
        MulterModuleOptionsProvider,
        MulterModuleIdProvider
    ]
})
export class MulterModule {
    static register(
        providers: Array<ValueProvider | FactoryProvider | ExistingProvider>,
    ): DynamicModuleInterface {
        return {
            module: MulterModule,
            providers: [...providers],
            exports: [...providers.map(item => item.provide)],
        };
    }

    static registerAsync(options: MulterModuleAsyncOptions): DynamicModuleInterface {
        return {
            module: MulterModule,
            imports: options.imports,
            providers: [
                ...this.createAsyncProviders(options),
                {
                    provide: MULTER_MODULE_ID,
                    useValue: randomStringGenerator(),
                },
            ],
            exports: [MULTER_MODULE_OPTIONS],
        };
    }

    private static createAsyncProviders(
        options: MulterModuleAsyncOptions,
    ): ProviderType[] {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }
        return [
            this.createAsyncOptionsProvider(options),
            {
                provide: options.useClass,
                useClass: options.useClass,
            },
        ];
    }

    private static createAsyncOptionsProvider(
        options: MulterModuleAsyncOptions,
    ): ProviderType {
        if (options.useFactory) {
            return {
                provide: MULTER_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }
        return {
            provide: MULTER_MODULE_OPTIONS,
            useFactory: async (optionsFactory: MulterOptionsFactory) =>
                optionsFactory.createMulterOptions(),
            inject: [options.useExisting || options.useClass],
        };
    }
}
