import { AbstractHttpAdapter } from '../core';

export class HttpAdapterHost<T extends AbstractHttpAdapter = AbstractHttpAdapter> {
  private _httpAdapter?: T;

  set httpAdapter(httpAdapter: T) {
    this._httpAdapter = httpAdapter;
  }

  get httpAdapter(): T {
    return this._httpAdapter;
  }
}
