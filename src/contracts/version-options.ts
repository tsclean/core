export enum VersioningType {
  URI,
  HEADER,
  MEDIA_TYPE,
  CUSTOM
}

export const VERSION_NEUTRAL = Symbol("VERSION_NEUTRAL");

export type VersionValue =
  | string
  | typeof VERSION_NEUTRAL
  | Array<string | typeof VERSION_NEUTRAL>;

export interface VersionOptions {
  version?: VersionValue;
}

export interface HeaderVersioningOptions {
  type: VersioningType.HEADER;
  header: string;
}

export interface UriVersioningOptions {
  type: VersioningType.URI;
  prefix?: string | false;
}

export interface MediaTypeVersioningOptions {
  type: VersioningType.MEDIA_TYPE;
  key: string;
}

export interface CustomVersioningOptions {
  type: VersioningType.CUSTOM;
  extractor: (request: unknown) => string | string[];
}

interface VersioningCommonOptions {
  defaultVersion?: VersionOptions["version"];
}

export type VersioningOptions = VersioningCommonOptions &
  (
    | HeaderVersioningOptions
    | UriVersioningOptions
    | MediaTypeVersioningOptions
    | CustomVersioningOptions
  );
