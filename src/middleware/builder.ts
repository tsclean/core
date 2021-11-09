import {iterate} from 'iterare';
import {RoutesMapper} from './routes-mapper';
import {filterMiddleware} from './utils';
import {
    HttpServer,
    MiddlewareConsumerInterface,
    Type,
    MiddlewareConfigProxyInterface,
    MiddlewareConfigurationInterface,
    RouteInfo
} from "../contracts";
import {flatten} from "../utils";

export class MiddlewareBuilder implements MiddlewareConsumerInterface {
    private readonly middlewareCollection = new Set<MiddlewareConfigurationInterface>();

    constructor(
        private readonly routesMapper: RoutesMapper,
        private readonly httpAdapter: HttpServer,
    ) {
    }

    public apply(...middleware: Array<Type<any> | Function | any>): MiddlewareConfigProxyInterface {
        return new MiddlewareBuilder.ConfigProxy(this, flatten(middleware));
    }

    public build(): MiddlewareConfigurationInterface[] {
        return [...this.middlewareCollection];
    }

    public getHttpAdapter(): HttpServer {
        return this.httpAdapter;
    }

    private static readonly ConfigProxy = class implements MiddlewareConfigProxyInterface {
        private excludedRoutes: RouteInfo[] = [];

        constructor(
            private readonly builder: MiddlewareBuilder,
            private readonly middleware: Array<Type<any> | Function | any>,
        ) {
        }

        public exclude(...routes: Array<string | RouteInfo>): MiddlewareConfigProxyInterface {
            this.excludedRoutes = this.getRoutesFlatList(routes);
            return this;
        }

        public forRoutes(...routes: Array<string | Type<any> | RouteInfo>): MiddlewareConsumerInterface {
            const {middlewareCollection} = this.builder;

            const forRoutes = this.getRoutesFlatList(routes);
            const configuration = {
                middleware: filterMiddleware(
                    this.middleware,
                    this.excludedRoutes,
                    this.builder.getHttpAdapter(),
                ),
                forRoutes,
            };
            middlewareCollection.add(configuration);
            return this.builder;
        }

        private getRoutesFlatList(routes: Array<string | Type<any> | RouteInfo>): RouteInfo[] {
            const {routesMapper} = this.builder;

            return iterate(routes)
                .map(route => routesMapper.mapRouteToRouteInfo(route))
                .flatten()
                .toArray();
        }
    };
}
