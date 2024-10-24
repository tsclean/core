import { Observable } from 'rxjs';
import { ExecutionContextInterface } from './execution-context';

export interface AccessResourceInterface {
  accessResource(context: ExecutionContextInterface): boolean | Promise<boolean> | Observable<boolean>;
}
