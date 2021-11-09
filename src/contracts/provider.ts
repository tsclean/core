import {AbstractInterface} from './abstract';
import {Scope} from './scope-options';
import {Type} from './type';

export interface ClassProvider<T = any> {

    provide: string | symbol | Type<any> | AbstractInterface<any> | Function;

    useClass: Type<T>;

    scope?: Scope;
}

export interface ValueProvider<T = any> {

    provide: string | symbol | Type<any> | AbstractInterface<any> | Function;

    useValue: T;
}

export interface FactoryProvider<T = any> {

    provide: string | symbol | Type<any> | AbstractInterface<any> | Function;

    useFactory: (...args: any[]) => T;

    inject?: Array<Type<any> | string | symbol | AbstractInterface<any> | Function>;

    scope?: Scope;
}

export interface ExistingProvider<T = any> {

    provide: string | symbol | Type<any> | AbstractInterface<any> | Function;

    useExisting: any;
}
