import { CorsOptions } from "./cors-options";

export interface GatewayMetadata {
    namespace?: string | RegExp;
    path?: string;
    serveClient?: boolean;
    adapter?: any;
    parser?: any;
    connectTimeout?: number;
    pingTimeout?: number;
    pingInterval?: number;
    upgradeTimeout?: number;
    maxHttpBufferSize?: number;
    allowRequest?: (
      req: any,
      fn: (err: string | null | undefined, success: boolean) => void,
    ) => void;
    transports?: Array<'polling' | 'websocket'>;
    allowUpgrades?: boolean;
    perMessageDeflate?: boolean | object;
    httpCompression?: boolean | object;
    wsEngine?: string;
    initialPacket?: any;
    cookie?: any | boolean;
    cors?: CorsOptions;
    allowEIO3?: boolean;
    destroyUpgrade?: boolean;
    destroyUpgradeTimeout?: number;
  }
  