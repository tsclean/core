import { Type } from '../../contracts'
import { InstanceWrapper } from '../../core'
import { EnhancerSubtype } from '../../helpers'

export interface EnhancerMetadataCacheEntry {
  targetNodeId?: string
  moduleToken: string
  classRef: Type
  methodKey: string | undefined
  enhancerRef?: unknown
  enhancerInstanceWrapper?: InstanceWrapper
  subtype: EnhancerSubtype
}
