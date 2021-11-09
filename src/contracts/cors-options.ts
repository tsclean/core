import {CustomOriginType, StaticOriginType} from "../types";

export interface CorsOptions {
  origin?: StaticOriginType | CustomOriginType;
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export interface CorsOptionsCallbackInterface {
  (error: Error, options: CorsOptions): void;
}

export interface CorsOptionsDelegate<T> {
  (req: T, cb: CorsOptionsCallbackInterface): void;
}
