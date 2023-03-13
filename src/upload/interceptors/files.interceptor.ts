import * as multer from 'multer';
import {Observable} from 'rxjs';
import {MULTER_MODULE_OPTIONS, MulterOptions} from '../interfaces';
import {transformException} from '../multer.utils';
import {
    CallHandlerInterface,
    ExecutionContextInterface,
    InterceptorInterface,
    Type
} from "../../contracts";
import {Inject, mixin, Optional} from "../../decorators";

type MulterInstance = any;

export function FilesInterceptor(
    fieldName: string,
    maxCount?: number,
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
                this.multer.array(fieldName, maxCount)(
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
