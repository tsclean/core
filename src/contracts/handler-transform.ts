import { Type } from './type';
import {ParamType} from "../types";

export type Transform<T = any> = (value: T, metadata: ArgumentMetadata) => any;

export interface ArgumentMetadata {

  readonly type: ParamType;

  readonly metaType?: Type<any> | undefined;

  readonly data?: string | undefined;
}

export interface HandlerTransform<T = any, R = any> {
  transform(value: T, metadata: ArgumentMetadata): R;
}
