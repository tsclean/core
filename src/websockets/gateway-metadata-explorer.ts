import { Observable } from 'rxjs'
import { MetadataScanner } from '../app'
import { CleanGateway } from '../contracts'
import {
  GATEWAY_SERVER_METADATA,
  MESSAGE_MAPPING_METADATA,
  MESSAGE_METADATA
} from '../helpers'
import { isFunction, isUndefined } from '../utils/shared.utils'

export interface MessageMappingProperties {
  message: any
  methodName: string
  callback: (...args: any[]) => Observable<any> | Promise<any> | any
}

export class GatewayMetadataExplorer {
  constructor (private readonly metadataScanner: MetadataScanner) {}

  public explore (instance: CleanGateway): MessageMappingProperties[] {
    const instancePrototype = Object.getPrototypeOf(instance)
    return this.metadataScanner
      .getAllMethodNames(instancePrototype)
      .map(method => this.exploreMethodMetadata(instancePrototype, method))
      .filter(metadata => metadata)
  }

  public exploreMethodMetadata (
    instancePrototype: object,
    methodName: string
  ): MessageMappingProperties {
    const callback = instancePrototype[methodName]
    const isMessageMapping = Reflect.getMetadata(
      MESSAGE_MAPPING_METADATA,
      callback
    )
    if (isUndefined(isMessageMapping)) {
      return null
    }
    const message = Reflect.getMetadata(MESSAGE_METADATA, callback)
    return {
      callback,
      message,
      methodName
    }
  }

  public *scanForServerHooks (instance: CleanGateway): IterableIterator<string> {
    for (const propertyKey in instance) {
      if (isFunction(propertyKey)) {
        continue
      }
      const property = String(propertyKey)
      const isServer = Reflect.getMetadata(
        GATEWAY_SERVER_METADATA,
        instance,
        property
      )
      if (!isUndefined(isServer)) {
        yield property
      }
    }
  }
}
