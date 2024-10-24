import { InstanceWrapper, ModulesContainer } from "../../core/injector";
import { Type } from "../../contracts";

export class DiscoverableMetaHostCollection {
    public static readonly metaHostLinks = new Map<Type | Function, string>();
  
    private static readonly providersByMetaKey = new WeakMap<
      ModulesContainer,
      Map<string, Set<InstanceWrapper>>
    >();
  
    private static readonly controllersByMetaKey = new WeakMap<
      ModulesContainer,
      Map<string, Set<InstanceWrapper>>
    >();
  
    public static addClassMetaHostLink(
      target: Type | Function,
      metadataKey: string,
    ) {
      this.metaHostLinks.set(target, metadataKey);
    }
 
    public static inspectProvider(
      hostContainerRef: ModulesContainer,
      instanceWrapper: InstanceWrapper,
    ) {
      return this.inspectInstanceWrapper(
        hostContainerRef,
        instanceWrapper,
        this.providersByMetaKey,
      );
    }
  
    public static inspectController(
      hostContainerRef: ModulesContainer,
      instanceWrapper: InstanceWrapper,
    ) {
      return this.inspectInstanceWrapper(
        hostContainerRef,
        instanceWrapper,
        this.controllersByMetaKey,
      );
    }
  
    public static insertByMetaKey(
      metaKey: string,
      instanceWrapper: InstanceWrapper,
      collection: Map<string, Set<InstanceWrapper>>,
    ) {
      if (collection.has(metaKey)) {
        const wrappers = collection.get(metaKey);
        wrappers.add(instanceWrapper);
      } else {
        const wrappers = new Set<InstanceWrapper>();
        wrappers.add(instanceWrapper);
        collection.set(metaKey, wrappers);
      }
    }
  
    public static getProvidersByMetaKey(
      hostContainerRef: ModulesContainer,
      metaKey: string,
    ): Set<InstanceWrapper> {
      const wrappersByMetaKey = this.providersByMetaKey.get(hostContainerRef);
      return wrappersByMetaKey?.get(metaKey) ?? new Set<InstanceWrapper>();
    }
  
    public static getControllersByMetaKey(
      hostContainerRef: ModulesContainer,
      metaKey: string,
    ): Set<InstanceWrapper> {
      const wrappersByMetaKey = this.controllersByMetaKey.get(hostContainerRef);
      return wrappersByMetaKey?.get(metaKey) ?? new Set<InstanceWrapper>();
    }
  
    private static inspectInstanceWrapper(
      hostContainerRef: ModulesContainer,
      instanceWrapper: InstanceWrapper,
      wrapperByMetaKeyMap: WeakMap<
        ModulesContainer,
        Map<string, Set<InstanceWrapper>>
      >,
    ) {
      const metaKey =
        DiscoverableMetaHostCollection.getMetaKeyByInstanceWrapper(
          instanceWrapper,
        );
      if (!metaKey) {
        return;
      }
  
      let collection: Map<string, Set<InstanceWrapper>>;
      if (wrapperByMetaKeyMap.has(hostContainerRef)) {
        collection = wrapperByMetaKeyMap.get(hostContainerRef);
      } else {
        collection = new Map<string, Set<InstanceWrapper>>();
        wrapperByMetaKeyMap.set(hostContainerRef, collection);
      }
      this.insertByMetaKey(metaKey, instanceWrapper, collection);
    }
  
    private static getMetaKeyByInstanceWrapper(
      instanceWrapper: InstanceWrapper<any>,
    ) {
      return this.metaHostLinks.get(
        instanceWrapper.metaType || instanceWrapper.inject
          ? (instanceWrapper.instance?.constructor ?? instanceWrapper.metaType)
          : instanceWrapper.metaType,
      );
    }
  }
  