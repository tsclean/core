import { GATEWAY_SERVER_METADATA } from '../../helpers'

export const WebSocketServer = (): PropertyDecorator => {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.set(target, propertyKey, null)
    Reflect.defineMetadata(GATEWAY_SERVER_METADATA, true, target, propertyKey)
  }
}
