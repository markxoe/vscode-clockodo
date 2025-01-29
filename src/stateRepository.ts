import { ExtensionContext } from "vscode";

export interface StateStorage {
  get<T>(key: string, defaultValue: T): T;
  update<T>(key: string, value: T): void;
}

export class VSCodeGlobalStateStorage implements StateStorage {
  private context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  get<T>(key: string, defaultValue: T): T {
    return this.context.globalState.get(key, defaultValue);
  }

  update<T>(key: string, value: T): void {
    this.context.globalState.update(key, value);
  }
}

export class StateRepository {
  private stateStorage: StateStorage;

  constructor(stateStorage: StateStorage) {
    this.stateStorage = stateStorage;
  }

  getLastCustomers(): number[] {
    return this.stateStorage.get("lastCustomers", []);
  }
  addLastCustomer(customerId: number) {
    let lastCustomers = this.getLastCustomers();
    lastCustomers = lastCustomers.filter((c) => c !== customerId);
    lastCustomers.unshift(customerId);
    this.stateStorage.update("lastCustomers", lastCustomers);
  }

  getLastServices(): number[] {
    return this.stateStorage.get("lastServices", []);
  }
  addLastService(serviceId: number) {
    let lastServices = this.getLastServices();
    lastServices = lastServices.filter((s) => s !== serviceId);
    lastServices.unshift(serviceId);
    this.stateStorage.update("lastServices", lastServices);
  }

  getLastProjects(
    customerId?: number
  ): { projectId: number; customerId: number }[] {
    const raw = this.stateStorage.get<
      { projectId: number; customerId: number }[]
    >("lastProjects", []);
    if (!customerId) {
      return raw;
    }
    return raw.filter((p) => p.customerId === customerId);
  }
  addLastProject(projectId: number, customerId: number) {
    let lastProjects = this.getLastProjects();
    lastProjects = lastProjects.filter(
      (p) => !(p.projectId === projectId && p.customerId === customerId)
    );
    lastProjects.unshift({ projectId, customerId });
    this.stateStorage.update("lastProjects", lastProjects);
  }

  clearRecents() {
    this.stateStorage.update("lastCustomers", []);
    this.stateStorage.update("lastServices", []);
    this.stateStorage.update("lastProjects", []);
  }
}
