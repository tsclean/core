import { Type } from './type';
import { ExceptionFilterInterface } from './exception-filter';

export interface ExceptionFilterMetadataInterface {
  func: ExceptionFilterInterface['catch'];
  exceptionMetaTypes: Type<any>[];
}
