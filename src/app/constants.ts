import { EnhancerSubtype } from "../helpers";

export const MESSAGES = {
  APPLICATION_START: `Starting TSClean application...`,
  APPLICATION_READY: `TSClean application successfully started`,
  UNKNOWN_EXCEPTION_MESSAGE: 'Internal server error',
  ERROR_DURING_SHUTDOWN: 'Error happened during shutdown',
  CALL_LISTEN_FIRST:
    'app.listen() needs to be called before calling app.getUrl()',
};

export const APP_INTERCEPTOR = 'APP_INTERCEPTOR';
export const APP_HANDLER = 'APP_HANDLER';
export const APP_RESOURCE = 'APP_RESOURCE';
export const APP_FILTER = 'APP_FILTER';

export const ENHANCER_TOKEN_TO_SUBTYPE_MAP: Record<
  | typeof APP_RESOURCE
  | typeof APP_HANDLER
  | typeof APP_FILTER
  | typeof APP_INTERCEPTOR,
  EnhancerSubtype
> = {
  [APP_RESOURCE]: 'resource',
  [APP_INTERCEPTOR]: 'interceptor',
  [APP_HANDLER]: 'handler' as EnhancerSubtype,
  [APP_FILTER]: 'filter',
} as const;
