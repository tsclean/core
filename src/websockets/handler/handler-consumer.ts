import { ArgumentMetadata, HandlerTransform } from '../../contracts'
import { ParamsTokenFactory } from '../../core'
import { RouteParamTypes } from '../../enums'

export class HandlerConsumer {
  private readonly paramsTokenFactory = new ParamsTokenFactory()

  public async apply<TInput = unknown> (
    value: TInput,
    { metaType, type, data }: ArgumentMetadata,
    pipes: HandlerTransform[]
  ) {
    const token = this.paramsTokenFactory.exchangeEnumForString(
      type as any as RouteParamTypes
    )
    return this.applyPipes(value, { metaType, type: token, data }, pipes)
  }

  public async applyPipes<TInput = unknown> (
    value: TInput,
    { metaType, type, data }: { metaType: any; type?: any; data?: any },
    transforms: HandlerTransform[]
  ) {
    return transforms.reduce(async (deferredValue, pipe) => {
      const val = await deferredValue
      const result = pipe.transform(val, { metaType, type, data })
      return result
    }, Promise.resolve(value))
  }
}
