import {
  CUSTOM_ROUTE_AGRS_METADATA,
  ExecutionContextHost,
  HandlerMetadataStorage,
  MESSAGE_METADATA,
  PARAM_ARGS_METADATA,
  PARAMTYPES_METADATA
} from '../../helpers'
import { ContextUtils, ParamProperties } from '../../helpers/context-utils'
import { ExceptionFiltersContext } from './exception-filters-context'
import { ContextType, ControllerType } from '../../types'
import {
  AccessResourceConsumer,
  AccessResourceContextCreator,
  FORBIDDEN_MESSAGE
} from '../../access'
import {
  HandlerConsumer,
  WsException,
  HandlerContextCreator,
  WsParamsFactory
} from '../../websockets'
import { HandlerTransform, ParamsMetadataInterface } from '../../contracts'
import {
  InterceptorsConsumer,
  InterceptorsContextCreator
} from '../../interceptors'
import { WsProxy } from './ws-proxy'
import { DEFAULT_CALLBACK_METADATA } from './ws-metadata-constants'
import { isEmpty } from '../../utils/shared.utils'

type WsParamProperties = ParamProperties & { metatype?: any }
export interface WsHandlerMetadata {
  argsLength: number
  paramtypes: any[]
  getParamsMetadata: (moduleKey: string) => WsParamProperties[]
}

export class WsContextCreator {
  private readonly contextUtils = new ContextUtils()
  private readonly wsParamsFactory = new WsParamsFactory()
  private readonly handlerMetadataStorage =
    new HandlerMetadataStorage<WsHandlerMetadata>()

  constructor (
    private readonly wsProxy: WsProxy,
    private readonly exceptionFiltersContext: ExceptionFiltersContext,
    private readonly handlerContextCreator: HandlerContextCreator,
    private readonly handlerConsumer: HandlerConsumer,
    private readonly guardsContextCreator: AccessResourceContextCreator,
    private readonly guardsConsumer: AccessResourceConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer
  ) {}

  public create<T extends ParamsMetadataInterface = ParamsMetadataInterface> (
    instance: ControllerType,
    callback: (...args: unknown[]) => void,
    moduleKey: string,
    methodName: string
  ): (...args: any[]) => Promise<void> {
    const contextType: ContextType = 'ws'
    const { argsLength, paramtypes, getParamsMetadata } = this.getMetadata<T>(
      instance,
      methodName,
      contextType
    )
    const exceptionHandler = this.exceptionFiltersContext.create(
      instance,
      callback,
      moduleKey
    )
    const pipes = this.handlerContextCreator.create(
      instance,
      callback,
      moduleKey
    )
    const guards = this.guardsContextCreator.create(
      instance,
      callback,
      moduleKey
    )
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      moduleKey
    )

    const paramsMetadata = getParamsMetadata(moduleKey)
    const paramsOptions = paramsMetadata
      ? this.contextUtils.mergeParamsMetaTypes(paramsMetadata, paramtypes)
      : []
    const fnApplyPipes = this.createPipesFn(pipes, paramsOptions)

    const fnCanActivate = this.createGuardsFn(
      guards,
      instance,
      callback,
      contextType
    )

    const handler = (initialArgs: unknown[], args: unknown[]) => async () => {
      if (fnApplyPipes) {
        await fnApplyPipes(initialArgs, ...args)
        return callback.apply(instance, initialArgs)
      }
      return callback.apply(instance, args)
    }
    const targetPattern = this.reflectCallbackPattern(callback)
    return this.wsProxy.create(
      async (...args: unknown[]) => {
        args.push(targetPattern)

        const initialArgs = this.contextUtils.createNullArray(argsLength)
        fnCanActivate && (await fnCanActivate(args))

        return this.interceptorsConsumer.intercept(
          interceptors,
          args,
          instance,
          callback,
          handler(initialArgs, args),
          contextType
        )
      },
      exceptionHandler,
      targetPattern
    )
  }

  public reflectCallbackParamtypes (
    instance: ControllerType,
    callback: (...args: any[]) => any
  ): any[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, instance, callback.name)
  }

  public reflectCallbackPattern (callback: (...args: any[]) => any): string {
    return Reflect.getMetadata(MESSAGE_METADATA, callback)
  }

  public createGuardsFn<TContext extends string = ContextType> (
    guards: any[],
    instance: ControllerType,
    callback: (...args: unknown[]) => any,
    contextType?: TContext
  ): Function | null {
    const canActivateFn = async (args: any[]) => {
      const canActivate = await this.guardsConsumer.tryAccess<TContext>(
        guards,
        args,
        instance,
        callback,
        contextType
      )
      if (!canActivate) {
        throw new WsException(FORBIDDEN_MESSAGE)
      }
    }
    return guards.length ? canActivateFn : null
  }

  public getMetadata<TMetadata, TContext extends ContextType = ContextType> (
    instance: ControllerType,
    methodName: string,
    contextType: TContext
  ): WsHandlerMetadata {
    const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName)
    if (cacheMetadata) {
      return cacheMetadata
    }
    const metadata =
      this.contextUtils.reflectCallbackMetadata<TMetadata>(
        instance,
        methodName,
        PARAM_ARGS_METADATA
      ) || DEFAULT_CALLBACK_METADATA
    const keys = Object.keys(metadata)
    const argsLength = this.contextUtils.getArgumentsLength(keys, metadata)
    const paramtypes = this.contextUtils.reflectCallbackParamTypes(
      instance,
      methodName
    )
    const contextFactory = this.contextUtils.getContextFactory(
      contextType,
      instance,
      instance[methodName]
    )
    const getParamsMetadata = (moduleKey: string) =>
      this.exchangeKeysForValues(
        keys,
        metadata,
        moduleKey,
        this.wsParamsFactory,
        contextFactory
      )

    const handlerMetadata: WsHandlerMetadata = {
      argsLength,
      paramtypes,
      getParamsMetadata
    }
    this.handlerMetadataStorage.set(instance, methodName, handlerMetadata)
    return handlerMetadata
  }

  public exchangeKeysForValues<TMetadata = any> (
    keys: string[],
    metadata: TMetadata,
    moduleContext: string,
    paramsFactory: WsParamsFactory,
    contextFactory: (args: unknown[]) => ExecutionContextHost
  ): ParamProperties[] {
    this.handlerContextCreator.setModuleContext(moduleContext)

    return keys.map(key => {
      const { index, data, handlers: pipesCollection } = metadata[key]
      const handlers =
        this.handlerContextCreator.createConcreteContext(pipesCollection)
      const type = this.contextUtils.mapParamType(key)

      if (key.includes(CUSTOM_ROUTE_AGRS_METADATA)) {
        const { factory } = metadata[key]
        const customExtractValue = this.contextUtils.getCustomFactory(
          factory,
          data,
          contextFactory
        )
        return { index, extractValue: customExtractValue, type, data, handlers }
      }
      const numericType = Number(type)
      const extractValue = (...args: any[]) =>
        paramsFactory.exchangeKeyForValue(numericType, data, args)

      return { index, extractValue, type: numericType, data, handlers }
    })
  }

  public createPipesFn (
    handler: HandlerTransform[],
    paramsOptions: (ParamProperties & { metaType?: unknown })[]
  ) {
    const pipesFn = async (args: unknown[], ...params: unknown[]) => {
      const resolveParamValue = async (
        param: ParamProperties & { metaType?: unknown }
      ) => {
        const {
          index,
          extractValue,
          type,
          data,
          metaType,
          handlers: paramPipes
        } = param
        const value = extractValue(...params)

        args[index] = await this.getParamValue(
          value,
          { metaType, type, data },
          handler.concat(paramPipes)
        )
      }
      await Promise.all(paramsOptions.map(resolveParamValue))
    }
    return paramsOptions.length ? pipesFn : null
  }

  public async getParamValue<T> (
    value: T,
    { metaType, type, data }: { metaType: any; type: any; data: any },
    pipes: HandlerTransform[]
  ): Promise<any> {
    return isEmpty(pipes)
      ? value
      : this.handlerConsumer.apply(value, { metaType, type, data }, pipes)
  }
}
