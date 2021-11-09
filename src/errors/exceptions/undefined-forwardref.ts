import {UNDEFINED_FORWARD_REF_MESSAGE} from '../messages';
import {RuntimeException} from './runtime';
import {Type} from "../../contracts";

export class UndefinedForwardRefException extends RuntimeException {
    constructor(scope: Type<any>[]) {
        super(UNDEFINED_FORWARD_REF_MESSAGE(scope));
    }
}
