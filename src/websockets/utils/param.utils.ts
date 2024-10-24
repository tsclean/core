import { HandlerTransform, Type } from '../../contracts'
import { assignMetadata } from '../../decorators'
import { PARAM_ARGS_METADATA } from '../../helpers'
import { isNil, isString } from '../../utils'
import { WsParamType } from '../../websockets/enums/ws-paramtype.enum'

export function createWsParamDecorator (
  paramtype: WsParamType
): (
  ...pipes: (Type<HandlerTransform> | HandlerTransform)[]
) => ParameterDecorator {
  return (...pipes: (Type<HandlerTransform> | HandlerTransform)[]) =>
    (target, key, index) => {
      const args =
        Reflect.getMetadata(PARAM_ARGS_METADATA, target.constructor, key) || {}
      Reflect.defineMetadata(
        PARAM_ARGS_METADATA,
        assignMetadata(args, paramtype, index, undefined, ...pipes),
        target.constructor,
        key
      )
    }
}

export const createPipesWsParamDecorator =
  (paramtype: WsParamType) =>
  (
    data?: any,
    ...pipes: (Type<HandlerTransform> | HandlerTransform)[]
  ): ParameterDecorator =>
  (target, key, index) => {
    const args =
      Reflect.getMetadata(PARAM_ARGS_METADATA, target.constructor, key) || {}
    const hasParamData = isNil(data) || isString(data)
    const paramData = hasParamData ? data : undefined
    const paramPipes = hasParamData ? pipes : [data, ...pipes]

    Reflect.defineMetadata(
      PARAM_ARGS_METADATA,
      assignMetadata(args, paramtype, index, paramData, ...paramPipes),
      target.constructor,
      key
    )
  }
