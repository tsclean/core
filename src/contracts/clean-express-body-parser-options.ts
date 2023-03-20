import type { Options } from "body-parser";

export type CleanExpressBodyParserOptions<T extends Options = Options> = Omit<
  T,
  "verify"
>;
