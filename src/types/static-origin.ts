export type StaticOriginType = boolean | string | RegExp | (string | RegExp)[];

export type CustomOriginType = (
    requestOrigin: string, callback: (err: Error | null, origin?: StaticOriginType) => void) => void;