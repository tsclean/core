export interface ResolverInterface {
  resolve(instance: any, basePath: string): void;
  registerNotFoundHandler(): void;
  registerExceptionHandler(): void;
}
