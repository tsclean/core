import {HttpServer} from './http-server.interface';
import {HandlerTransform} from "./handler-transform";
import {AccessResourceInterface} from './access-resource';
import {ExceptionFilterInterface} from "./exception-filter";
import {InterceptorInterface} from './interceptor';
import {GlobalPrefixOptionsInterface} from './global-prefix-options';
import {ApplicationContextInterface} from './application-context';
import {CorsOptionsDelegate, CorsOptions} from "./cors-options";
import { WebSocketAdapter } from './web-socket-adapter';


export interface ApplicationInterface extends ApplicationContextInterface {

    use(...args: any[]): this;

    enableCors(options?: CorsOptions | CorsOptionsDelegate<any>): void;

    listen(port: number | string, callback?: () => void): Promise<any>;

    listen(port: number | string, hostname: string, callback?: () => void): Promise<any>;

    getUrl(): Promise<string>;

    setGlobalPrefix(prefix: string, options?: GlobalPrefixOptionsInterface): this;

    getHttpServer(): any;

    getHttpAdapter(): HttpServer;

    useGlobalFilters(...filters: ExceptionFilterInterface[]): this;

    useGlobalHandler(...pipes: HandlerTransform<any>[]): this;

    useGlobalInterceptors(...interceptors: InterceptorInterface[]): this;

    useGlobalAccessResources(...guards: AccessResourceInterface[]): this;

    useWebSocketAdapter(adapter: WebSocketAdapter): this;

    close(): Promise<void>;
}
