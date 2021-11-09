import {isRouteExcluded} from './utils';
import {ApplicationConfig} from "../app";
import {addLeadingSlash, flatten, isUndefined, stripEndSlash} from "../utils";
import {RequestMethod} from "../enums";
import {RoutePathMetadataInterface} from "../contracts";

export class RoutePathFactory {
    constructor(private readonly applicationConfig: ApplicationConfig) {
    }

    public create(metadata: RoutePathMetadataInterface, requestMethod?: RequestMethod): string[] {
        let paths = [''];

        paths = this.appendToAllIfDefined(paths, metadata.modulePath);
        paths = this.appendToAllIfDefined(paths, metadata.ctrlPath);
        paths = this.appendToAllIfDefined(paths, metadata.methodPath);

        if (metadata.globalPrefix) {
            paths = paths.map(path => {
                if (this.isExcludedFromGlobalPrefix(path, requestMethod)) {
                    return path;
                }
                return stripEndSlash(metadata.globalPrefix || '') + path;
            });
        }

        return paths
            .map(path => addLeadingSlash(path || '/'))
            .map(path => (path !== '/' ? stripEndSlash(path) : path));
    }

    public appendToAllIfDefined(paths: string[], fragmentToAppend: string | string[] | undefined): string[] {
        if (!fragmentToAppend) return paths;

        const concatPaths = (a: string, b: string) => stripEndSlash(a) + addLeadingSlash(b);

        if (Array.isArray(fragmentToAppend)) {
            const paths2dArray = paths.map(path => fragmentToAppend.map(fragment => concatPaths(path, fragment)));
            return flatten(paths2dArray);
        }
        return paths.map(path => concatPaths(path, fragmentToAppend));
    }

    public isExcludedFromGlobalPrefix(path: string, requestMethod?: RequestMethod) {
        if (isUndefined(requestMethod)) return false;

        const options = this.applicationConfig.getGlobalPrefixOptions();
        const excludedRoutes = options.exclude;
        return (
            Array.isArray(excludedRoutes) && isRouteExcluded(excludedRoutes, path, requestMethod)
        );
    }
}
