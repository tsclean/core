import { WsParamType } from "../../websockets/enums/ws-paramtype.enum";

export const DEFAULT_CALLBACK_METADATA = {
    [`${WsParamType.PAYLOAD}:1`]: { index: 1, data: undefined, pipes: [] },
    [`${WsParamType.SOCKET}:0`]: { index: 0, data: undefined, pipes: [] },
  };