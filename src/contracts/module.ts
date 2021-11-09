import { MiddlewareConsumerInterface } from './middleware-consumer';

export interface ModuleInterface {
  configure(consumer: MiddlewareConsumerInterface);
}
