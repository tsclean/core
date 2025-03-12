import { Observable } from 'rxjs';
import { ExecutionContextInterface } from './execution-context';

export interface CanActivate {
  canActivate(
    context: ExecutionContextInterface,
  ): boolean | Promise<boolean> | Observable<boolean>;
}
