import { HttpStatus } from '../enums';
import { HttpException } from './http.exception';

export class ForbiddenException extends HttpException {
  constructor(
    objectOrError?: string | object | any,
    description = 'Forbidden',
  ) {
    super(
      HttpException.createBody(
        objectOrError,
        description,
        HttpStatus.FORBIDDEN,
      ),
      HttpStatus.FORBIDDEN,
    );
  }
}
