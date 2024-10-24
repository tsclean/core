import { EnhancerSubtype } from '../../helpers'

export interface AttachedEnhancerDefinition {
  nodeId: string
}

export interface OrphanedEnhancerDefinition {
  subtype: EnhancerSubtype
  ref: unknown
}

export interface Extras {
  orphanedEnhancers: Array<OrphanedEnhancerDefinition>
  attachedEnhancers: Array<AttachedEnhancerDefinition>
}
