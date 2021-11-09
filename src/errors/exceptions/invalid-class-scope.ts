import { INVALID_CLASS_SCOPE_MESSAGE } from '../messages';
import { RuntimeException } from './runtime';
import {AbstractInterface, Type} from "../../contracts";
import {isFunction} from "../../utils/";

export class InvalidClassScopeException extends RuntimeException {
  constructor(metaTypeOrToken: Type<any> | AbstractInterface<any> | string | symbol) {
    let name = isFunction(metaTypeOrToken) ? (metaTypeOrToken as Function).name : metaTypeOrToken;
    name = name && name.toString();

    super(INVALID_CLASS_SCOPE_MESSAGE`${name}`);
  }
}
