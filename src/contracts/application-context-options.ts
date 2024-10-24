import { LoggerService, LogLevel } from '../services'

export interface GetOrResolveOptions {
  strict?: boolean
  each?: boolean
}

export class ApplicationContextOptionsInterface {
  logger?: LoggerService | LogLevel[] | false

  abortOnError?: boolean | undefined

  bufferLogs?: boolean

  autoFlushLogs?: boolean

  preview?: boolean

  snapshot?: boolean
}
