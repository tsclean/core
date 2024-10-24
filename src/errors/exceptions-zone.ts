import { Logger } from '../services'
import { ExceptionHandler } from './exception-handler'

const DEFAULT_TEARDOWN = () => process.exit(1)

export class ExceptionsZone {
  private static readonly exceptionHandler = new ExceptionHandler()

  public static run (
    callback: () => void,
    teardown: (err: any) => void = DEFAULT_TEARDOWN
  ) {
    try {
      callback()
    } catch (e) {
      this.exceptionHandler.handle(e)
      teardown(e)
    }
  }

  public static async asyncRun (
    callback: () => Promise<void>,
    teardown: (err: any) => void = DEFAULT_TEARDOWN,
    autoFlushLogs: boolean
  ) {
    try {
      await callback()
    } catch (e) {
      this.exceptionHandler.handle(e)
      if (autoFlushLogs) {
        Logger.flush()
      }
      teardown(e)
    }
  }
}
