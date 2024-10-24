import { HandlerTransform, Type } from '../../contracts'
import { WsParamType } from '../../websockets/enums/ws-paramtype.enum'
import { createPipesWsParamDecorator } from '../../websockets/utils/param.utils'

export function MessageBody(): ParameterDecorator

export function MessageBody(
  ...pipes: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator

export function MessageBody(
  propertyKey: string,
  ...pipes: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator
export function MessageBody (
  propertyOrPipe?: string | (Type<HandlerTransform> | HandlerTransform),
  ...pipes: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator {
  return createPipesWsParamDecorator(WsParamType.PAYLOAD)(
    propertyOrPipe,
    ...pipes
  )
}
