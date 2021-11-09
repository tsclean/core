import {isEmpty} from "../../utils";
import {InvalidExceptionFilterException} from '../../errors';
import {ExternalExceptionFilter} from './external-exception-filter';
import {ArgumentsHostInterface, ExceptionFilterMetadataInterface, Type} from "../../contracts";

export class ExternalExceptionsHandler extends ExternalExceptionFilter {
    private filters: ExceptionFilterMetadataInterface[] = [];

    public next(exception: Error | any, host: ArgumentsHostInterface): Promise<any> {
        const result = this.invokeCustomFilters(exception, host);
        if (result) return result;
        return super.catch(exception, host);
    }

    public setCustomFilters(filters: ExceptionFilterMetadataInterface[]) {
        if (!Array.isArray(filters)) throw new InvalidExceptionFilterException();
        this.filters = filters;
    }

    public invokeCustomFilters<T = any>(exception: T, host: ArgumentsHostInterface): Promise<any> | null {
        if (isEmpty(this.filters)) return null;

        const isInstanceOf = (metaType: Type<unknown>) => exception instanceof metaType;

        const filter = this.filters.find(({exceptionMetaTypes}) => {
            return !exceptionMetaTypes.length || exceptionMetaTypes.some(isInstanceOf);
        });
        return filter ? filter.func(exception, host) : null;
    }
}
