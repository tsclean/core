import * as multer from 'multer';
import {Observable} from 'rxjs';
import {MulterModuleOptions, MulterOptions} from '../interfaces';
import {Inject, mixin, Optional} from "../../decorators";
import {CallHandlerInterface, ExecutionContextInterface, InterceptorInterface, Type} from "../../contracts";
import {MULTER_MODULE_OPTIONS} from "../multer.constants";
import {transformException} from "../multer.utils";


type MulterInstance = any;

export function AnyFilesInterceptor(
    localOptions?: MulterOptions,
): Type<InterceptorInterface> {
    class MixinInterceptor implements InterceptorInterface {
        protected multer: MulterInstance;

        constructor(
            @Optional()
            @Inject(MULTER_MODULE_OPTIONS)
                options: MulterModuleOptions = {},
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
                this.multer.any()(ctx.getRequest(), ctx.getResponse(), (err: any) => {
                    if (err) {
                        const error = transformException(err);
                        return reject(error);
                    }
                    resolve();
                }),
            );
            return next.handle();
        }
    }

    return mixin(MixinInterceptor);
}
