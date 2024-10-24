import { InjectionToken } from '../../contracts'

type CommonEdgeMetadata = {
  sourceModuleName: string
  targetModuleName: string
}

type ModuleToModuleEdgeMetadata = {
  type: 'module-to-module'
} & CommonEdgeMetadata

type ClassToClassEdgeMetadata = {
  type: 'class-to-class'
  sourceClassName: string
  targetClassName: string
  sourceClassToken: InjectionToken
  targetClassToken: InjectionToken
  injectionType: 'constructor' | 'property' | 'decorator'
  keyOrIndex?: string | number | symbol
  internal?: boolean
} & CommonEdgeMetadata

export interface Edge {
  id: string
  source: string
  target: string
  metadata: ModuleToModuleEdgeMetadata | ClassToClassEdgeMetadata
}
