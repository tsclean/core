import { InjectionToken, Scope } from "../../contracts";
import { EnhancerSubtype } from "../../helpers";

export type ModuleNode = {
    metadata: {
      type: 'module';
      global: boolean;
      dynamic: boolean;
      internal: boolean;
    };
  };
  
  export type ClassNode = {
    parent: string;
    metadata: {
      type: 'provider' | 'controller' | 'middleware' | 'service';
      subtype?: EnhancerSubtype;
      sourceModuleName: string;
      durable: boolean;
      static: boolean;
      transient: boolean;
      exported: boolean;
      scope: Scope;
      token: InjectionToken;
      initTime: number;
      enhancers?: Array<
        | { id: string; subtype: EnhancerSubtype }
        | { name: string; methodKey?: string; subtype: EnhancerSubtype }
      >;
      global?: boolean;
      internal?: boolean;
    };
  };
  
  export type Node = {
    id: string;
    label: string;
  } & (ClassNode | ModuleNode);