import {isEmpty} from "../../utils";
import {HttpException} from "../../exceptions";
import {BaseExceptionFilter} from './base-exception-filter';
import {InvalidExceptionFilterException} from '../../errors';
import {ArgumentsHostInterface, ExceptionFilterMetadataInterface, Type} from "../../contracts";

export class ExceptionsHandler extends BaseExceptionFilter {
    private filters: ExceptionFilterMetadataInterface[] = [];

    public next(exception: Error | HttpException | any, ctx: ArgumentsHostInterface) {
        if (this.invokeCustomFilters(exception, ctx)) return;
        super.catch(exception, ctx);
    }

    public setCustomFilters(filters: ExceptionFilterMetadataInterface[]) {
        if (!Array.isArray(filters)) throw new InvalidExceptionFilterException();
        this.filters = filters;
    }

    public invokeCustomFilters<T = any>(exception: T, ctx: ArgumentsHostInterface): boolean {
        if (isEmpty(this.filters)) return false;
        const isInstanceOf = (metaType: Type<unknown>) => exception instanceof metaType;

        const filter = this.filters.find(({exceptionMetaTypes}) => {
            return !exceptionMetaTypes.length || exceptionMetaTypes.some(isInstanceOf);
        });
        filter && filter.func(exception, ctx);
        return !!filter;
    }
}
