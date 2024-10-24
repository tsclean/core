import { WsParamType } from '../../websockets/enums'
import { createWsParamDecorator } from '../../websockets/utils'

export const ConnectedSocket: () => ParameterDecorator = createWsParamDecorator(
  WsParamType.SOCKET,
)
