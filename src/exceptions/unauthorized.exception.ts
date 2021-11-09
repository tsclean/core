import { HttpStatus } from '../enums';
import { HttpException } from './http.exception';

export class UnauthorizedException extends HttpException {

  constructor(
    objectOrError?: string | object | any, description = 'Unauthorized'
  ) {
    super(
      HttpException.createBody(
        objectOrError,
        description,
        HttpStatus.UNAUTHORIZED,
      ),
      HttpStatus.UNAUTHORIZED,
    );
  }
}
