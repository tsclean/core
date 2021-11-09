import { ArgumentsHostInterface } from './arguments-host';

export interface ExceptionFilterInterface<T = any> {
  catch(exception: T, host: ArgumentsHostInterface): any;
}
