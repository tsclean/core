import { ContainerIoC } from './container'
import { Injector } from './injector'
import { InternalCoreModule } from './internal-core-module'
import { Module } from './module'
import { ControllerType, InjectableType } from '../../types'
import { GraphInspector } from '../../inspector'
import { Logger, LoggerService } from '../../services'
import { MODULE_INIT_MESSAGE } from '../../helpers'

export class InstanceLoader<TInjector extends Injector = Injector> {
  constructor (
    private readonly container: ContainerIoC,
    protected readonly injector: TInjector,
    protected readonly graphInspector: GraphInspector,
    private logger: LoggerService = new Logger(InstanceLoader.name, {
      timestamp: true
    })
  ) {}

  public setLogger (logger: Logger) {
    this.logger = logger
  }

  public async createInstancesOfDependencies (
    modules: Map<string, Module> = this.container.getModules()
  ) {
    this.createPrototypes(modules)
    await this.createInstances(modules)
  }

  private createPrototypes (modules: Map<string, Module>) {
    modules.forEach(moduleRef => {
      this.createPrototypesOfProviders(moduleRef)
      this.createPrototypesOfInjectables(moduleRef)
      this.createPrototypesOfControllers(moduleRef)
    })
  }

  private async createInstances (modules: Map<string, Module>) {
    await Promise.all(
      [...modules.values()].map(async moduleRef => {
        await this.createInstancesOfProviders(moduleRef)
        await this.createInstancesOfInjectables(moduleRef)
        await this.createInstancesOfControllers(moduleRef)

        const { name } = moduleRef.metaType
        this.isModuleWhitelisted(name) &&
          this.logger.log(MODULE_INIT_MESSAGE`${name}`)
      })
    )
  }

  private createPrototypesOfProviders (moduleRef: Module) {
    const { providers } = moduleRef
    providers.forEach(wrapper =>
      this.injector.loadPrototype<InjectableType>(wrapper, providers)
    )
  }

  private async createInstancesOfProviders (moduleRef: Module) {
    const { providers } = moduleRef
    const wrappers = [...providers.values()]
    await Promise.all(
      wrappers.map(item => this.injector.loadProvider(item, moduleRef))
    )
  }

  private createPrototypesOfControllers (moduleRef: Module) {
    const { controllers } = moduleRef
    controllers.forEach(wrapper =>
      this.injector.loadPrototype<ControllerType>(wrapper, controllers)
    )
  }

  private async createInstancesOfControllers (moduleRef: Module) {
    const { controllers } = moduleRef
    const wrappers = [...controllers.values()]
    await Promise.all(
      wrappers.map(item => this.injector.loadController(item, moduleRef))
    )
  }

  private createPrototypesOfInjectables (moduleRef: Module) {
    const { injectables } = moduleRef
    injectables.forEach(wrapper =>
      this.injector.loadPrototype(wrapper, injectables)
    )
  }

  private async createInstancesOfInjectables (moduleRef: Module) {
    const { injectables } = moduleRef
    const wrappers = [...injectables.values()]
    await Promise.all(
      wrappers.map(item => this.injector.loadInjectable(item, moduleRef))
    )
  }

  private isModuleWhitelisted (name: string): boolean {
    return name !== InternalCoreModule.name
  }
}
