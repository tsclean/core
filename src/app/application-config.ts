import { InstanceWrapper } from '../core';
import {ExcludeRouteMetadataInterface, HandlerTransform, WebSocketAdapter} from '../contracts';
import {
  AccessResourceInterface,
  ExceptionFilterInterface,
  GlobalPrefixOptionsInterface,
  InterceptorInterface,
} from "../contracts";
import { CanActivate } from '../contracts/can-activate';

export class ApplicationConfig {
  private globalPrefix = '';
  private globalPrefixOptions: GlobalPrefixOptionsInterface<ExcludeRouteMetadataInterface> = {};
  private globalHandlers: Array<HandlerTransform> = [];
  private globalFilters: Array<ExceptionFilterInterface> = [];
  private globalInterceptors: Array<InterceptorInterface> = [];
  private globalGuards: Array<CanActivate> = [];
  private globalAccessResource: Array<AccessResourceInterface> = [];
  private readonly globalRequestHandlers: InstanceWrapper<HandlerTransform>[] = [];
  private readonly globalRequestFilters: InstanceWrapper<ExceptionFilterInterface>[] = [];
  private readonly globalRequestInterceptors: InstanceWrapper<InterceptorInterface>[] = [];
  private readonly globalRequestGuards: InstanceWrapper<CanActivate>[] = [];
  private readonly globalRequestAccessResource: InstanceWrapper<AccessResourceInterface>[] = [];
 
  constructor(private ioAdapter: WebSocketAdapter | null = null) {}

  public setGlobalPrefix(prefix: string) {
    this.globalPrefix = prefix;
  }

  public getGlobalPrefix() {
    return this.globalPrefix;
  }

  public setGlobalPrefixOptions(options: GlobalPrefixOptionsInterface<ExcludeRouteMetadataInterface>) {
    this.globalPrefixOptions = options;
  }

  public getGlobalPrefixOptions(): GlobalPrefixOptionsInterface<ExcludeRouteMetadataInterface> {
    return this.globalPrefixOptions;
  }

  public setIoAdapter(ioAdapter: WebSocketAdapter) {
    this.ioAdapter = ioAdapter;
  }

  public getIoAdapter(): WebSocketAdapter {
    return this.ioAdapter;
  }

  public addGlobalHandler(handler: HandlerTransform<any>) {
    this.globalHandlers.push(handler);
  }

  public useGlobalHandlers(...pipes: HandlerTransform<any>[]) {
    this.globalHandlers = this.globalHandlers.concat(pipes);
  }

  public getGlobalFilters(): ExceptionFilterInterface[] {
    return this.globalFilters;
  }

  public addGlobalFilter(filter: ExceptionFilterInterface) {
    this.globalFilters.push(filter);
  }

  public useGlobalFilters(...filters: ExceptionFilterInterface[]) {
    this.globalFilters = this.globalFilters.concat(filters);
  }

  public getGlobalHandlers(): HandlerTransform<any>[] {
    return this.globalHandlers;
  }

  public getGlobalInterceptors(): InterceptorInterface[] {
    return this.globalInterceptors;
  }

  public addGlobalInterceptor(interceptor: InterceptorInterface) {
    this.globalInterceptors.push(interceptor);
  }

  public useGlobalInterceptors(...interceptors: InterceptorInterface[]) {
    this.globalInterceptors = this.globalInterceptors.concat(interceptors);
  }

  public getGlobalGuards(): CanActivate[] {
    return this.globalGuards;
  }

  public addGlobalGuard(guard: CanActivate) {
    this.globalGuards.push(guard);
  }

  public useGlobalGuards(...guards: CanActivate[]) {
    this.globalGuards = this.globalGuards.concat(guards);
  }


  public getGlobalAccessResources(): AccessResourceInterface[] {
    return this.globalAccessResource;
  }

  public addGlobalAccessResource(guard: AccessResourceInterface) {
    this.globalAccessResource.push(guard);
  }

  public useGlobalAccessResource(...guards: AccessResourceInterface[]) {
    this.globalAccessResource = this.globalAccessResource.concat(guards);
  }

  public addGlobalRequestInterceptor(wrapper: InstanceWrapper<InterceptorInterface>) {
    this.globalRequestInterceptors.push(wrapper);
  }

  public getGlobalRequestInterceptors(): InstanceWrapper<InterceptorInterface>[] {
    return this.globalRequestInterceptors;
  }

  public addGlobalRequestHandler(wrapper: InstanceWrapper<HandlerTransform>) {
    this.globalRequestHandlers.push(wrapper);
  }

  public getGlobalRequestHandlers(): InstanceWrapper<HandlerTransform>[] {
    return this.globalRequestHandlers;
  }

  public addGlobalRequestFilter(wrapper: InstanceWrapper<ExceptionFilterInterface>) {
    this.globalRequestFilters.push(wrapper);
  }

  public getGlobalRequestFilters(): InstanceWrapper<ExceptionFilterInterface>[] {
    return this.globalRequestFilters;
  }

  public addGlobalRequestGuard(wrapper: InstanceWrapper<CanActivate>) {
    this.globalRequestGuards.push(wrapper);
  }

  public getGlobalRequestGuards(): InstanceWrapper<CanActivate>[] {
    return this.globalRequestGuards;
  }

  public addGlobalRequestAccessResource(wrapper: InstanceWrapper<AccessResourceInterface>) {
    this.globalRequestAccessResource.push(wrapper);
  }

  public getGlobalRequestAccessResource(): InstanceWrapper<AccessResourceInterface>[] {
    return this.globalRequestAccessResource;
  }
}
