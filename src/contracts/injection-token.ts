import { Type } from './type'
import { AbstractInterface } from './abstract'

export type InjectionToken<T = any> =
  | string
  | symbol
  | Type<T>
  | AbstractInterface<T>
  | Function
