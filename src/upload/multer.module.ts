import {
  MulterModuleAsyncOptions,
  MulterModuleOptions,
  MulterOptionsFactory,
} from './interfaces';
import {MULTER_MODULE_ID} from './multer.constants';
import {Container} from "../decorators";
import {ProviderType} from "../types";
import {DynamicModuleInterface, MULTER_MODULE_OPTIONS} from "../contracts";
import {randomStringGenerator} from "../utils";
import {FileInterceptor} from "./interceptors";

let options: MulterModuleOptions;

@Container({
  providers: [
    {
      provide: MULTER_MODULE_OPTIONS,
      useValue: options
    }
  ]
})
export class MulterModule {
  static register(options: MulterModuleOptions = {}): DynamicModuleInterface {
    return {
      module: MulterModule,
      providers: [
        { provide: MULTER_MODULE_OPTIONS, useValue: options },
        {
          provide: MULTER_MODULE_ID,
          useValue: randomStringGenerator(),
        },
      ],
      exports: [MULTER_MODULE_OPTIONS],
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
