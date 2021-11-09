import {iterate} from 'iterare';
import {ApplicationConfig} from '../../app';
import {
    InvalidClassException,
    RuntimeException,
    UnknownExportException
} from '../../errors';
import {createContextId, getClassScope} from '../../helpers';
import {CONTROLLER_ID_KEY} from './constants';
import {ContainerIoC} from './container';
import {InstanceWrapper} from './instance-wrapper';
import {ModuleRef} from './module-ref';
import {
    ClassProvider,
    DynamicModuleInterface,
    ExistingProvider,
    FactoryProvider,
    ModuleInterface,
    Type,
    ValueProvider
} from "../../contracts";
import {
    isFunction,
    isNil,
    isString,
    isSymbol,
    isUndefined,
    randomStringGenerator
} from "../../utils";
import {
    ControllerType,
    InjectableType,
    InstanceTokenType, ProviderType
} from "../../types";

export class Module {
    private readonly _id: string;
    private readonly _imports = new Set<Module>();
    private readonly _providers = new Map<InstanceTokenType, InstanceWrapper<InjectableType>>();
    private readonly _injectables = new Map<InstanceTokenType, InstanceWrapper<InjectableType>>();
    private readonly _middlewares = new Map<InstanceTokenType, InstanceWrapper<InjectableType>>();
    private readonly _controllers = new Map<InstanceTokenType, InstanceWrapper<ControllerType>>();
    private readonly _exports = new Set<InstanceTokenType>();
    private _distance = 0;
    private _token: string;

    constructor(
        private readonly _metaType: Type<any>,
        private readonly container: ContainerIoC,
    ) {
        this.addCoreProviders();
        this._id = randomStringGenerator();
    }

    get id(): string {
        return this._id;
    }

    get token(): string {
        return this._token;
    }

    set token(token: string) {
        this._token = token;
    }

    get providers(): Map<InstanceTokenType, InstanceWrapper<InjectableType>> {
        return this._providers;
    }

    get middlewares(): Map<InstanceTokenType, InstanceWrapper<InjectableType>> {
        return this._middlewares;
    }

    get imports(): Set<Module> {
        return this._imports;
    }

    get routes(): Map<InstanceTokenType, InstanceWrapper<ControllerType>> {
        return this._controllers;
    }

    get injectables(): Map<InstanceTokenType, InstanceWrapper<InjectableType>> {
        return this._injectables;
    }

    get controllers(): Map<InstanceTokenType, InstanceWrapper<ControllerType>> {
        return this._controllers;
    }

    get exports(): Set<InstanceTokenType> {
        return this._exports;
    }

    get instance(): ModuleInterface {
        if (!this._providers.has(this._metaType)) throw new RuntimeException();

        const module = this._providers.get(this._metaType);
        return module.instance as ModuleInterface;
    }

    get metaType(): Type<any> {
        return this._metaType;
    }

    get distance(): number {
        return this._distance;
    }

    set distance(value: number) {
        this._distance = value;
    }

    public addCoreProviders() {
        this.addModuleAsProvider();
        this.addModuleRef();
        this.addApplicationConfig();
    }

    public addModuleRef() {
        const moduleRef = this.createModuleReferenceType();
        this._providers.set(
            ModuleRef,
            new InstanceWrapper({
                token: ModuleRef,
                name: ModuleRef.name,
                metaType: ModuleRef as any,
                isResolved: true,
                instance: new moduleRef(),
                host: this,
            }),
        );
    }

    public addModuleAsProvider() {
        this._providers.set(
            this._metaType,
            new InstanceWrapper({
                token: this._metaType,
                name: this._metaType.name,
                metaType: this._metaType,
                isResolved: false,
                instance: null,
                host: this,
            }),
        );
    }

    public addApplicationConfig() {
        this._providers.set(
            ApplicationConfig,
            new InstanceWrapper({
                token: ApplicationConfig,
                name: ApplicationConfig.name,
                isResolved: true,
                instance: this.container.applicationConfig,
                host: this,
            }),
        );
    }

    public addInjectable<T extends InjectableType>(injectable: ProviderType, host?: Type<T>) {
        if (this.isCustomProvider(injectable)) {
            return this.addCustomProvider(injectable, this._injectables);
        }
        let instanceWrapper = this.injectables.get(injectable);
        if (!instanceWrapper) {
            instanceWrapper = new InstanceWrapper({
                token: injectable,
                name: injectable.name,
                metaType: injectable,
                instance: null,
                isResolved: false,
                scope: getClassScope(injectable),
                host: this,
            });
            this._injectables.set(injectable, instanceWrapper);
        }
        if (host) {
            const hostWrapper =
                this._controllers.get(host) || this._providers.get(host);
            hostWrapper && hostWrapper.addEnhancerMetadata(instanceWrapper);
        }
    }

    public addProvider(provider: ProviderType) {
        if (this.isCustomProvider(provider)) {
            return this.addCustomProvider(provider, this._providers);
        }
        this._providers.set(
            provider,
            new InstanceWrapper({
                token: provider,
                name: (provider as Type<InjectableType>).name,
                metaType: provider as Type<InjectableType>,
                instance: null,
                isResolved: false,
                scope: getClassScope(provider),
                host: this,
            }),
        );
        return provider as Type<InjectableType>;
    }

    public isCustomProvider(provider: ProviderType): provider is
        | ClassProvider
        | FactoryProvider
        | ValueProvider
        | ExistingProvider {
        return !isNil(
            (
                provider as
                    | ClassProvider
                    | FactoryProvider
                    | ValueProvider
                    | ExistingProvider
            ).provide,
        );
    }

    public addCustomProvider(
        provider:
            | ClassProvider
            | FactoryProvider
            | ValueProvider
            | ExistingProvider,
        collection: Map<Function | string | symbol, any>,
    ) {
        if (this.isCustomClass(provider)) {
            this.addCustomClass(provider, collection);
        } else if (this.isCustomValue(provider)) {
            this.addCustomValue(provider, collection);
        } else if (this.isCustomFactory(provider)) {
            this.addCustomFactory(provider, collection);
        } else if (this.isCustomUseExisting(provider)) {
            this.addCustomUseExisting(provider, collection);
        }
        return provider.provide;
    }

    public isCustomClass(provider: any): provider is ClassProvider {
        return !isUndefined((provider as ClassProvider).useClass);
    }

    public isCustomValue(provider: any): provider is ValueProvider {
        return !isUndefined((provider as ValueProvider).useValue);
    }

    public isCustomFactory(provider: any): provider is FactoryProvider {
        return !isUndefined((provider as FactoryProvider).useFactory);
    }

    public isCustomUseExisting(provider: any): provider is ExistingProvider {
        return !isUndefined((provider as ExistingProvider).useExisting);
    }

    public isDynamicModule(exported: any): exported is DynamicModuleInterface {
        return exported && exported.module;
    }

    public addCustomClass(
        provider: ClassProvider,
        collection: Map<InstanceTokenType, InstanceWrapper>,
    ) {
        let {scope} = provider;

        const {useClass} = provider;
        if (isUndefined(scope)) {
            scope = getClassScope(useClass);
        }
        collection.set(
            provider.provide,
            new InstanceWrapper({
                token: provider.provide,
                name: useClass?.name || useClass,
                metaType: useClass,
                instance: null,
                isResolved: false,
                scope,
                host: this,
            }),
        );
    }

    public addCustomValue(
        provider: ValueProvider,
        collection: Map<Function | string | symbol, InstanceWrapper>,
    ) {
        const {useValue: value, provide: providerToken} = provider;
        collection.set(
            providerToken,
            new InstanceWrapper({
                token: providerToken,
                name: (providerToken as Function)?.name || providerToken,
                metaType: null,
                instance: value,
                isResolved: true,
                async: value instanceof Promise,
                host: this,
            }),
        );
    }

    public addCustomFactory(
        provider: FactoryProvider,
        collection: Map<Function | string | symbol, InstanceWrapper>,
    ) {
        const {
            useFactory: factory,
            inject,
            scope,
            provide: providerToken,
        } = provider;

        collection.set(
            providerToken,
            new InstanceWrapper({
                token: providerToken,
                name: (providerToken as Function)?.name || providerToken,
                metaType: factory as any,
                instance: null,
                isResolved: false,
                inject: inject || [],
                scope,
                host: this,
            }),
        );
    }

    public addCustomUseExisting(
        provider: ExistingProvider,
        collection: Map<Function | string | symbol, InstanceWrapper>,
    ) {
        const {useExisting, provide: providerToken} = provider;
        collection.set(
            providerToken,
            new InstanceWrapper({
                token: providerToken,
                name: (providerToken as Function)?.name || providerToken,
                metaType: (instance => instance) as any,
                instance: null,
                isResolved: false,
                inject: [useExisting],
                host: this,
                isAlias: true,
            }),
        );
    }

    public addExportedProvider(
        provider: ProviderType | string | symbol | DynamicModuleInterface,
    ) {
        const addExportedUnit = (token: InstanceTokenType) =>
            this._exports.add(this.validateExportedProvider(token));

        if (this.isCustomProvider(provider as any)) {
            return this.addCustomExportedProvider(provider as any);
        } else if (isString(provider) || isSymbol(provider)) {
            return addExportedUnit(provider);
        } else if (this.isDynamicModule(provider)) {
            const {module: moduleClassRef} = provider;
            return addExportedUnit(moduleClassRef);
        }
        addExportedUnit(provider as Type<any>);
    }

    public addCustomExportedProvider(
        provider:
            | FactoryProvider
            | ValueProvider
            | ClassProvider
            | ExistingProvider,
    ) {
        const provide = provider.provide;
        if (isString(provide) || isSymbol(provide)) {
            return this._exports.add(this.validateExportedProvider(provide));
        }
        this._exports.add(this.validateExportedProvider(provide));
    }

    public validateExportedProvider(token: InstanceTokenType) {
        if (this._providers.has(token)) {
            return token;
        }
        const imports = iterate(this._imports.values())
            .filter(item => !!item)
            .map(({metaType}) => metaType)
            .filter(metaType => !!metaType)
            .toArray();

        if (!imports.includes(token as Type<unknown>)) {
            const {name} = this._metaType;
            const providerName = isFunction(token) ? (token as Function).name : token;
            throw new UnknownExportException(providerName as string, name);
        }
        return token;
    }

    public addController(controller: Type<ControllerType>) {
        this._controllers.set(
            controller,
            new InstanceWrapper({
                token: controller,
                name: controller.name,
                metaType: controller,
                instance: null,
                isResolved: false,
                scope: getClassScope(controller),
                host: this,
            }),
        );

        this.assignControllerUniqueId(controller);
    }

    public assignControllerUniqueId(controller: Type<ControllerType>) {
        Object.defineProperty(controller, CONTROLLER_ID_KEY, {
            enumerable: false,
            writable: false,
            configurable: true,
            value: randomStringGenerator(),
        });
    }

    public addRelatedModule(module: Module) {
        this._imports.add(module);
    }

    public replace(toReplace: InstanceTokenType, options: any) {
        if (options.isProvider && this.hasProvider(toReplace)) {
            const originalProvider = this._providers.get(toReplace);

            return originalProvider.mergeWith({provide: toReplace, ...options});
        } else if (!options.isProvider && this.hasInjectable(toReplace)) {
            const originalInjectable = this._injectables.get(toReplace);

            return originalInjectable.mergeWith({
                provide: toReplace,
                ...options,
            });
        }
    }

    public hasProvider(token: InstanceTokenType): boolean {
        return this._providers.has(token);
    }

    public hasInjectable(token: InstanceTokenType): boolean {
        return this._injectables.has(token);
    }

    public getProviderByKey<T = any>(name: InstanceTokenType): InstanceWrapper<T> {
        return this._providers.get(name) as InstanceWrapper<T>;
    }

    public createModuleReferenceType(): Type<ModuleRef> {
        const self = this;
        return class extends ModuleRef {
            constructor() {
                super(self.container);
            }

            public get<T = any, R = T>(typeOrToken: Type<T> | string | symbol,
                                       options: { strict: boolean } = {strict: true}): R {

                return !(options && options.strict)
                    ? this.find<T, R>(typeOrToken) : this.find<T, R>(typeOrToken, self);
            }

            public resolve<T = any, R = T>(typeOrToken: Type<T> | string | symbol, contextId = createContextId(),
                                           options: { strict: boolean } = {strict: true}): Promise<R> {

                return this.resolvePerContext(typeOrToken, self, contextId, options);
            }

            public async create<T = any>(type: Type<T>): Promise<T> {
                if (!(type && isFunction(type) && type.prototype)) throw new InvalidClassException(type);
                return this.instantiateClass<T>(type, self);
            }
        };
    }
}
