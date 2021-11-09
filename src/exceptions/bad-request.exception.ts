import { HttpStatus } from '../enums';
import { HttpException } from './http.exception';

export class BadRequestException extends HttpException {
  constructor(
    objectOrError?: string | object | any, description = 'Bad Request'
  ) {
    super(
      HttpException.createBody(
        objectOrError,
        description,
        HttpStatus.BAD_REQUEST,
      ),
      HttpStatus.BAD_REQUEST,
    );
  }
}
