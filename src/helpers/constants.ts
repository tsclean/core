export const MODULE_METADATA = {
  IMPORTS: 'imports',
  PROVIDERS: 'providers',
  CONTROLLERS: 'controllers',
  EXPORTS: 'exports',
};
export const GLOBAL_MODULE_METADATA = '__module:global__';
export const HOST_METADATA = 'host';
export const PATH_METADATA = 'path';
export const PARAMTYPES_METADATA = 'design:paramtypes';
export const SELF_DECLARED_DEPS_METADATA = 'self:paramtypes';
export const OPTIONAL_DEPS_METADATA = 'optional:paramtypes';
export const PROPERTY_DEPS_METADATA = 'self:properties_metadata';
export const OPTIONAL_PROPERTY_DEPS_METADATA = 'optional:properties_metadata';
export const SCOPE_OPTIONS_METADATA = 'scope:options';
export const METHOD_METADATA = 'method';
export const ROUTE_ARGS_METADATA = '__routeArguments__';
export const CUSTOM_ROUTE_AGRS_METADATA = '__customRouteArgs__';
export const EXCEPTION_FILTERS_METADATA = '__exceptionFilters__';
export const FILTER_CATCH_EXCEPTIONS = '__filterCatchExceptions__';
export const HANDLER_METADATA = '__handlers__';
export const RESOURCES_METADATA = '__resources__';
export const GUARDS_METADATA = '__guards__';
export const RENDER_METADATA = '__renderTemplate__';
export const INTERCEPTORS_METADATA = '__interceptors__';
export const HTTP_CODE_METADATA = '__httpCode__';
export const MODULE_PATH = '__module_path__';
export const HEADERS_METADATA = '__headers__';
export const REDIRECT_METADATA = '__redirect__';
export const RESPONSE_PASSTHROUGH_METADATA = '__responsePassthrough__';
export const ROUTES = Symbol('ROUTES');

export const ENHANCER_KEY_TO_SUBTYPE_MAP = {
  [GUARDS_METADATA]: 'guard',
  [INTERCEPTORS_METADATA]: 'interceptor',
  [RESOURCES_METADATA]: 'resource',
  [EXCEPTION_FILTERS_METADATA]: 'filter',
} as const;

export type EnhancerSubtype =
  (typeof ENHANCER_KEY_TO_SUBTYPE_MAP)[keyof typeof ENHANCER_KEY_TO_SUBTYPE_MAP];

export const MESSAGE_MAPPING_METADATA = 'websockets:message_mapping';
export const MESSAGE_METADATA = 'message';
export const GATEWAY_SERVER_METADATA = 'websockets:is_socket';
export const GATEWAY_METADATA = 'websockets:is_gateway';
export const NAMESPACE_METADATA = 'namespace';
export const PORT_METADATA = 'port';
export const GATEWAY_OPTIONS = 'websockets:gateway_options';
export const PARAM_ARGS_METADATA = ROUTE_ARGS_METADATA;

export const CONNECTION_EVENT = 'connection';
export const DISCONNECT_EVENT = 'disconnect';
export const CLOSE_EVENT = 'close';
export const ERROR_EVENT = 'error';
