import {Optional, Service} from '../decorators';
import {isObject} from "../utils";
import { ConsoleLogger } from './console-logger.service';
import { isLogLevelEnabled } from './utils/is-log-level-enabled.util';

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

export interface LoggerService {
  log(message: any, ...optionalParams: any[]): any;
  error(message: any, ...optionalParams: any[]): any;
  warn(message: any, ...optionalParams: any[]): any;
  debug?(message: any, ...optionalParams: any[]): any;
  verbose?(message: any, ...optionalParams: any[]): any;
  fatal?(message: any, ...optionalParams: any[]): any;
  setLogLevels?(levels: LogLevel[]): any;
}

interface LogBufferRecord {
  methodRef: Function;
  arguments: unknown[];
}

const DEFAULT_LOGGER = new ConsoleLogger();

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  day: '2-digit',
  month: '2-digit',
});

@Service()
export class Logger implements LoggerService {
  protected static logBuffer = new Array<LogBufferRecord>();
  protected static staticInstanceRef?: LoggerService = DEFAULT_LOGGER;
  protected static logLevels?: LogLevel[];
  private static isBufferAttached: boolean;

  protected localInstanceRef?: LoggerService;

  private static WrapBuffer: MethodDecorator = (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    const originalFn = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      if (Logger.isBufferAttached) {
        Logger.logBuffer.push({
          methodRef: originalFn.bind(this),
          arguments: args,
        });
        return;
      }
      return originalFn.call(this, ...args);
    };
  };

  constructor();
  constructor(context: string);
  constructor(context: string, options?: { timestamp?: boolean });
  constructor(
    @Optional() protected context?: string,
    @Optional() protected options: { timestamp?: boolean } = {},
  ) {}

  get localInstance(): LoggerService {
    if (Logger.staticInstanceRef === DEFAULT_LOGGER) {
      return this.registerLocalInstanceRef();
    } else if (Logger.staticInstanceRef instanceof Logger) {
      const prototype = Object.getPrototypeOf(Logger.staticInstanceRef);
      if (prototype.constructor === Logger) {
        return this.registerLocalInstanceRef();
      }
    }
    return Logger.staticInstanceRef;
  }

  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: [...any, string?, string?]): void;
  @Logger.WrapBuffer
  error(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? (optionalParams.length ? optionalParams : [undefined]).concat(
          this.context,
        )
      : optionalParams;

    this.localInstance?.error(message, ...optionalParams);
  }

  log(message: any, context?: string): void;
  log(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  log(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.log(message, ...optionalParams);
  }

  warn(message: any, context?: string): void;
  warn(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  warn(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.warn(message, ...optionalParams);
  }

  debug(message: any, context?: string): void;
  debug(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  debug(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.debug?.(message, ...optionalParams);
  }

  verbose(message: any, context?: string): void;
  verbose(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  verbose(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.verbose?.(message, ...optionalParams);
  }

  fatal(message: any, context?: string): void;
  fatal(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  fatal(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.fatal?.(message, ...optionalParams);
  }

  static error(message: any, stackOrContext?: string): void;
  static error(message: any, context?: string): void;
  static error(message: any, stack?: string, context?: string): void;
  static error(
    message: any,
    ...optionalParams: [...any, string?, string?]
  ): void;
  @Logger.WrapBuffer
  static error(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.error(message, ...optionalParams);
  }

  static log(message: any, context?: string): void;
  static log(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static log(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.log(message, ...optionalParams);
  }

  static warn(message: any, context?: string): void;
  static warn(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static warn(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.warn(message, ...optionalParams);
  }

  static debug(message: any, context?: string): void;
  static debug(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static debug(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.debug?.(message, ...optionalParams);
  }

  static verbose(message: any, context?: string): void;
  static verbose(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static verbose(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.verbose?.(message, ...optionalParams);
  }

  static fatal(message: any, context?: string): void;
  static fatal(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static fatal(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.fatal?.(message, ...optionalParams);
  }

  static flush() {
    this.isBufferAttached = false;
    this.logBuffer.forEach(item =>
      item.methodRef(...(item.arguments as [string])),
    );
    this.logBuffer = [];
  }

  static attachBuffer() {
    this.isBufferAttached = true;
  }

  static detachBuffer() {
    this.isBufferAttached = false;
  }

  static getTimestamp() {
    return dateTimeFormatter.format(Date.now());
  }

  static overrideLogger(logger: LoggerService | LogLevel[] | boolean) {
    if (Array.isArray(logger)) {
      Logger.logLevels = logger;
      return this.staticInstanceRef?.setLogLevels(logger);
    }
    if (isObject(logger)) {
      if (logger instanceof Logger && logger.constructor !== Logger) {
        const errorMessage = `Using the "extends Logger" instruction is not allowed in Nest v9. Please, use "extends ConsoleLogger" instead.`;
        this.staticInstanceRef.error(errorMessage);
        throw new Error(errorMessage);
      }
      this.staticInstanceRef = logger as LoggerService;
    } else {
      this.staticInstanceRef = undefined;
    }
  }

  static isLevelEnabled(level: LogLevel): boolean {
    const logLevels = Logger.logLevels;
    return isLogLevelEnabled(level, logLevels);
  }

  private registerLocalInstanceRef() {
    if (this.localInstanceRef) {
      return this.localInstanceRef;
    }
    this.localInstanceRef = new ConsoleLogger(this.context, {
      timestamp: this.options?.timestamp,
      logLevels: Logger.logLevels,
    });
    return this.localInstanceRef;
  }
}
