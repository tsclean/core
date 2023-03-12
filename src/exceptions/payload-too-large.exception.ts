import {HttpException, HttpExceptionOptions} from "./http.exception";
import {HttpStatus} from "../enums";

export class PayloadTooLargeException extends HttpException{
    constructor(
        objectOrError?: string | object | any,
        descriptionOrOptions: string | HttpExceptionOptions = 'Payload Too Large',
    ) {
        const { description, httpExceptionOptions } =
            HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);

        super(
            HttpException.createBody(
                objectOrError,
                description,
                HttpStatus.PAYLOAD_TOO_LARGE,
            ),
            HttpStatus.PAYLOAD_TOO_LARGE,
            httpExceptionOptions,
        );
    }
}
