import { ExecutionContextInterface } from './execution-context';

export interface AccessResourceInterface {
  accessResource(context: ExecutionContextInterface): boolean | Promise<boolean>;
}
