import {HttpsOptions} from './https-options.interface';
import {CorsOptionsDelegate, CorsOptions} from "./cors-options";
import {ApplicationContextOptionsInterface} from './application-context-options';

export interface ApplicationOptionsInterface extends ApplicationContextOptionsInterface {

    cors?: boolean | CorsOptions | CorsOptionsDelegate<any>;

    bodyParser?: boolean;

    httpsOptions?: HttpsOptions;
}
