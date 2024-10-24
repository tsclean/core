import { ArgumentsHostInterface } from './arguments-host'

export interface WsExceptionFilter<T = any> {
  catch(exception: T, host: ArgumentsHostInterface): any
}
