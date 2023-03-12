import multer from 'multer';
import {Observable} from 'rxjs';
import {MulterModuleOptions, MulterOptions} from '../interfaces';
import {transformException} from '../multer.utils';
import {
    CallHandlerInterface,
    ExecutionContextInterface,
    InterceptorInterface,
    MULTER_MODULE_OPTIONS,
    Type
} from "../../contracts";
import {Adapter, Inject, mixin, Optional} from "../../decorators";

type MulterInstance = any;

export class FileInterceptor implements InterceptorInterface {

    // protected multer: MulterInstance;
    protected fieldName: string;
    protected options: MulterModuleOptions;

    constructor(
        @Optional()
        @Adapter(MULTER_MODULE_OPTIONS)
            options: MulterModuleOptions = {},
        fieldName = ''
    ) {
        // this.multer = (multer as any)({
        //     ...options,
        //     // ...localOptions,
        // });

        // this.multer = multer({...options}) as any

        this.options = options;
        this.fieldName = fieldName;
    }

    async intercept(
        context: ExecutionContextInterface,
        next: CallHandlerInterface,
    ): Promise<Observable<any>> {
        const ctx = context.getHttp();

        await new Promise<void>((resolve, reject) =>
            multer({...this.options}).single(this.fieldName)(
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

// export function FileInterceptor(
//     fieldName: string,
//     localOptions?: MulterOptions,
// ): Type<InterceptorInterface> {
//     class MixinInterceptor implements InterceptorInterface {
//         protected multer: MulterInstance;
//
//         constructor(
//             @Optional()
//             @Inject(MULTER_MODULE_OPTIONS)
//                 options: MulterModuleOptions = {},
//         ) {
//             this.multer = (multer as any)({
//                 ...options,
//                 ...localOptions,
//             });
//         }
//
//         async intercept(
//             context: ExecutionContextInterface,
//             next: CallHandlerInterface,
//         ): Promise<Observable<any>> {
//             const ctx = context.getHttp();
//
//             await new Promise<void>((resolve, reject) =>
//                 this.multer.single(fieldName)(
//                     ctx.getRequest(),
//                     ctx.getResponse(),
//                     (err: any) => {
//                         if (err) {
//                             const error = transformException(err);
//                             return reject(error);
//                         }
//                         resolve();
//                     },
//                 ),
//             );
//             return next.handle();
//         }
//     }
//
//     return mixin(MixinInterceptor);
// }
