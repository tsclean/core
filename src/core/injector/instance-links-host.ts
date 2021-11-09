import {UnknownElementException} from '../../errors/exceptions/unknown-element';
import {ContainerIoC} from './container';
import {InstanceWrapper} from './instance-wrapper';
import {Module} from './module';
import {isFunction} from "../../utils/shared.utils";
import {InstanceTokenType} from "../../types";

type HostCollection = 'providers' | 'controllers' | 'injectables';

export interface InstanceLink<T = any> {
    token: InstanceTokenType;
    wrapperRef: InstanceWrapper<T>;
    collection: Map<any, InstanceWrapper>;
    moduleId: string;
}

export class InstanceLinksHost {
    private readonly instanceLinks = new Map<InstanceTokenType, InstanceLink[]>();

    constructor(private readonly container: ContainerIoC) {
        this.initialize();
    }

    get<T = any>(token: InstanceTokenType, moduleId?: string): InstanceLink<T> {
        const modulesMap = this.instanceLinks.get(token);

        if (!modulesMap) {
            throw new UnknownElementException(InstanceLinksHost.getInstanceNameByToken(token));
        }
        const instanceLink = moduleId
            ? modulesMap.find(item => item.moduleId === moduleId)
            : modulesMap[modulesMap.length - 1];

        if (!instanceLink) {
            throw new UnknownElementException(InstanceLinksHost.getInstanceNameByToken(token));
        }
        return instanceLink;
    }

    private initialize() {
        const modules = this.container.getModules();
        modules.forEach(moduleRef => {
            const {providers, injectables, controllers} = moduleRef;
            providers.forEach((wrapper, token) =>
                this.addLink(wrapper, token, moduleRef, 'providers'),
            );
            injectables.forEach((wrapper, token) =>
                this.addLink(wrapper, token, moduleRef, 'injectables'),
            );
            controllers.forEach((wrapper, token) =>
                this.addLink(wrapper, token, moduleRef, 'controllers'),
            );
        });
    }

    private addLink(
        wrapper: InstanceWrapper,
        token: InstanceTokenType,
        moduleRef: Module,
        collectionName: HostCollection,
    ) {
        const instanceLink: InstanceLink = {
            moduleId: moduleRef.id,
            wrapperRef: wrapper,
            collection: moduleRef[collectionName],
            token,
        };
        const existingLinks = this.instanceLinks.get(token);
        if (!existingLinks) {
            this.instanceLinks.set(token, [instanceLink]);
        } else {
            existingLinks.push(instanceLink);
        }
    }

    private static getInstanceNameByToken(token: InstanceTokenType): string {
        return isFunction(token) ? (token as Function)?.name : (token as string);
    }
}
