import { INQUIRER } from './inquirer-constants';
import {Scope} from "../../../contracts";
import {ProviderType} from "../../../types";

const noop = () => {};
export const inquirerProvider: ProviderType = {
  provide: INQUIRER,
  scope: Scope.TRANSIENT,
  useFactory: noop,
};
