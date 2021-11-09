import { REQUEST } from './request-constants';
import {ProviderType} from "../../types";
import {Scope} from "../../contracts";

const noop = () => {};
export const requestProvider: ProviderType = {
  provide: REQUEST,
  scope: Scope.REQUEST,
  useFactory: noop,
};
