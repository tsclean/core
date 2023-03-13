import multer from 'multer';
import {Observable} from 'rxjs';
import {MulterOptions, MULTER_MODULE_OPTIONS} from '../interfaces';
import {transformException} from '../multer.utils';
import {
    CallHandlerInterface,
    ExecutionContextInterface,
    InterceptorInterface,
    Type
} from "../../contracts";
import {Adapter, Inject, mixin, Optional} from "../../decorators";

type MulterInstance = any;

export function FileInterceptor(
    fieldName: string,
    localOptions?: MulterOptions,
): Type<InterceptorInterface> {
    class MixinInterceptor implements InterceptorInterface {
        protected multer: MulterInstance;

        constructor(
            @Optional()
            @Inject(MULTER_MODULE_OPTIONS)
                options: MulterOptions = {},
        ) {
            this.multer = (multer as any)({
                ...options,
                ...localOptions,
            });
        }

        async intercept(
            context: ExecutionContextInterface,
            next: CallHandlerInterface,
        ): Promise<Observable<any>> {
            const ctx = context.getHttp();

            await new Promise<void>((resolve, reject) =>
                this.multer.single(fieldName)(
                    ctx.getRequest(),
                    ctx.getResponse(),
                    (err: any) => {
                        if (err) {
                            const error = transformException(err);
                            return reject(error);
                        }
                        resolve();
                    },
                ),
            );
            return next.handle();
        }
    }

    return mixin(MixinInterceptor);
}
