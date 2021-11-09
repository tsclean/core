import { CONTROLLER_ID_KEY } from '../core/injector/constants';
import {HandlerMetadataInterface, Type} from "../contracts";
import {ControllerType} from "../types";

export const HANDLER_METADATA_SYMBOL = Symbol.for('handler_metadata:cache');

export class HandlerMetadataStorage<V = HandlerMetadataInterface, K extends Type<unknown> = any> {
  private readonly [HANDLER_METADATA_SYMBOL] = new Map<string, V>();

  set(controller: K, methodName: string, metadata: V) {
    const metadataKey = HandlerMetadataStorage.getMetadataKey(controller, methodName);
    this[HANDLER_METADATA_SYMBOL].set(metadataKey, metadata);
  }

  get(controller: K, methodName: string): V | undefined {
    const metadataKey = HandlerMetadataStorage.getMetadataKey(controller, methodName);
    return this[HANDLER_METADATA_SYMBOL].get(metadataKey);
  }

  private static getMetadataKey(controller: ControllerType, methodName: string): string {
    const ctor = controller.constructor;
    const controllerKey = ctor && (ctor[CONTROLLER_ID_KEY] || ctor.name);
    return controllerKey + methodName;
  }
}
