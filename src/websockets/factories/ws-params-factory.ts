import { WsParamType } from "../../websockets/enums/ws-paramtype.enum";

export class WsParamsFactory {
    public exchangeKeyForValue(
      type: number,
      data: string | undefined,
      args: unknown[],
    ) {
      if (!args) {
        return null;
      }
      switch (type as WsParamType) {
        case WsParamType.SOCKET:
          return args[0];
        case WsParamType.PAYLOAD:
          return data ? args[1]?.[data] : args[1];
        default:
          return null;
      }
    }
  }