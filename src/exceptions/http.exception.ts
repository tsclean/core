import { isObject, isString } from '../utils';
import {Logger} from "../services";

export interface HttpExceptionOptions {
  cause?: Error;
  description?: string;
}

export interface DescriptionAndOptions {
  description?: string;
  httpExceptionOptions?: HttpExceptionOptions;
}

export class HttpException extends Error {

  constructor(
    private readonly response: string | Record<string, any>,
    private readonly status: number,
    private readonly options?: HttpExceptionOptions,
  ) {
    super();
    this.initMessage();
    this.initName();
    this.initCause();
  }

  public cause: Error | undefined;

  public initCause(): void {
    if (this.options?.cause) {
      this.cause = this.options.cause;
      return;
    }

    if (this.response instanceof Error) {
      Logger.warn(
          'DEPRECATED! Passing the error cause as the first argument to HttpException constructor is deprecated. You should use the "options" parameter instead: new HttpException("message", 400, { cause: new Error("Some Error") }) ',
      );
      this.cause = this.response;
    }
  }

  public initMessage() {
    if (isString(this.response)) {
      this.message = this.response;
    } else if (
      isObject(this.response) &&
      isString((this.response as Record<string, any>).message)
    ) {
      this.message = (this.response as Record<string, any>).message;
    } else if (this.constructor) {
      this.message = this.constructor.name
        .match(/[A-Z][a-z]+|[0-9]+/g)
        .join(' ');
    }
  }

  public initName(): void {
    this.name = this.constructor.name;
  }

  public getResponse(): string | object {
    return this.response;
  }

  public getStatus(): number {
    return this.status;
  }

  public static createBody(
    objectOrError: object | string, description?: string, statusCode?: number) {
    if (!objectOrError) return { statusCode, message: description };

    return isObject(objectOrError) && !Array.isArray(objectOrError)
      ? objectOrError : { statusCode, message: objectOrError, error: description };
  }

  public static extractDescriptionAndOptionsFrom(
      descriptionOrOptions: string | HttpExceptionOptions,
  ): DescriptionAndOptions {
    const description = isString(descriptionOrOptions)
        ? descriptionOrOptions
        : descriptionOrOptions?.description;

    const httpExceptionOptions = isString(descriptionOrOptions)
        ? {}
        : descriptionOrOptions;

    return {
      description,
      httpExceptionOptions,
    };
  }
}
