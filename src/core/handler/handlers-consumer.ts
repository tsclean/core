import {RouteParamTypes} from "../../enums";
import {ParamsTokenFactory} from './params-token-factory';
import {ArgumentMetadata, HandlerTransform} from "../../contracts";

export class HandlersConsumer {
    private readonly paramsTokenFactory = new ParamsTokenFactory();

    public async apply<T = unknown>(
        value: T, {metaType, type, data}: ArgumentMetadata, handlers: HandlerTransform[]) {

        const token = this.paramsTokenFactory.exchangeEnumForString(
            type as any as RouteParamTypes,
        );
        return this.applyHandlers(value, {metaType, type: token, data}, handlers);
    }

    public async applyHandlers<T = unknown>(
        value: T, {metaType, type, data}: { metaType: any; type?: any; data?: any },
        transforms: HandlerTransform[]) {

        return transforms.reduce(async (deferredValue, pipe) => {
            const val = await deferredValue;
            return pipe.transform(val, {metaType, type, data});
        }, Promise.resolve(value));
    }
}
