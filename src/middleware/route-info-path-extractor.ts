import { addLeadingSlash, stripEndSlash } from '../utils/shared.utils'
import { ApplicationConfig } from '../app'
import { isRouteExcluded } from '../router/utils'
import { ExcludeRouteMetadataInterface, RouteInfo } from '../contracts'

export class RouteInfoPathExtractor {
  private readonly prefixPath: string
  private readonly excludedGlobalPrefixRoutes: ExcludeRouteMetadataInterface[]

  constructor (private readonly applicationConfig: ApplicationConfig) {
    this.prefixPath = stripEndSlash(
      addLeadingSlash(this.applicationConfig.getGlobalPrefix())
    )
    this.excludedGlobalPrefixRoutes =
      this.applicationConfig.getGlobalPrefixOptions().exclude
  }

  public extractPathsFrom ({ path, method }: RouteInfo): string[] {
    if (this.isAWildcard(path)) {
      const entries = this.prefixPath
        ? [this.prefixPath + '$', this.prefixPath + addLeadingSlash(path)]
        : [addLeadingSlash(path)]

      return Array.isArray(this.excludedGlobalPrefixRoutes)
        ? [
            ...entries,
            ...this.excludedGlobalPrefixRoutes.map(route =>
              addLeadingSlash(route.path)
            )
          ]
        : entries
    }

    return this.extractNonWildcardPathsFrom({ path, method })
  }

  public extractPathFrom (route: RouteInfo): string[] {
    if (this.isAWildcard(route.path)) {
      return [addLeadingSlash(route.path)]
    }

    return this.extractNonWildcardPathsFrom(route)
  }

  private isAWildcard (path: string): boolean {
    return ['*', '/*', '/*/', '(.*)', '/(.*)'].includes(path)
  }

  private extractNonWildcardPathsFrom ({ path, method }: RouteInfo): string[] {
    if (
      Array.isArray(this.excludedGlobalPrefixRoutes) &&
      isRouteExcluded(this.excludedGlobalPrefixRoutes, path, method)
    ) {
      return [addLeadingSlash(path)];
    }

    return [this.prefixPath + addLeadingSlash(path)];
  }
}
