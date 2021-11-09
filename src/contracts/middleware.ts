export interface MiddlewareInterface<T = any, R = any> {
  use(req: T, res: R, next: () => void): any;
}
