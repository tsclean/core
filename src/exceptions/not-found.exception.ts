import { HttpStatus } from '../enums';
import { HttpException } from './http.exception';

export class NotFoundException extends HttpException {

  constructor(
    objectOrError?: string | object | any, description = 'Not Found'
  ) {
    super(
      HttpException.createBody(
        objectOrError,
        description,
        HttpStatus.NOT_FOUND,
      ),
      HttpStatus.NOT_FOUND,
    );
  }
}
