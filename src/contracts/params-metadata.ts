import {ParamData} from "../decorators";

export type ParamsMetadataInterface = Record<number, ParamData>;
export interface ParamMetadataInterface {
  index: number;
  data?: ParamData;
}
