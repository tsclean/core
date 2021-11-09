import { HttpStatus } from '../enums';
import { HttpException } from './http.exception';

export class InternalServerErrorException extends HttpException {
  constructor(
    objectOrError?: string | object | any, description = 'Internal Server Error'
  ) {
    super(
      HttpException.createBody(
        objectOrError,
        description,
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
