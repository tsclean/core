import {Type} from './index';
import {ArgumentsHostInterface} from './arguments-host';

export interface ExecutionContextInterface extends ArgumentsHostInterface {

    getClass<T = any>(): Type<T>;

    getHandler(): Function;
}
