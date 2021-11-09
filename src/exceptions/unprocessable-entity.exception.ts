import { HttpStatus } from '../enums';
import { HttpException } from './http.exception';

export class UnprocessableEntityException extends HttpException {

  constructor(
    objectOrError?: string | object | any, description = 'Unprocessable Entity'
  ) {
    super(
      HttpException.createBody(
        objectOrError,
        description,
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
