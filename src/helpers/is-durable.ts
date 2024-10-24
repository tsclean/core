import { Type } from '../contracts'
import { SCOPE_OPTIONS_METADATA } from './constants'

export function isDurable (provider: Type<unknown>): boolean | undefined {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider)
  return metadata && metadata.durable
}
