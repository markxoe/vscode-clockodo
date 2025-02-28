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

  getRecentEntries(): {
    customerId: number;
    serviceId: number;
    projectId?: number;
    text?: string;
  }[] {
    return this.stateStorage.get("recentEntries", []);
  }

  addRecentEntry(
    customerId: number,
    serviceId: number,
    projectId?: number,
    text?: string
  ) {
    let recentEntries = this.getRecentEntries();
    recentEntries = recentEntries.filter(
      (e) =>
        e.customerId !== customerId ||
        e.serviceId !== serviceId ||
        e.projectId !== projectId ||
        (e.text !== text && e.text !== undefined)
    );
    recentEntries.unshift({ customerId, serviceId, projectId, text });
    this.stateStorage.update("recentEntries", recentEntries);
  }

  getRecentCustomers() {
    let customerIds = this.getRecentEntries().map((e) => e.customerId);
    let uniqueCustomerIds = Array.from(new Set(customerIds));
    return uniqueCustomerIds;
  }

  getRecentProjects(customer: number) {
    let projectIds = this.getRecentEntries()
      .filter((e) => e.customerId === customer)
      .map((e) => e.projectId);
    let uniqueServiceIds = Array.from(new Set(projectIds));
    return uniqueServiceIds;
  }

  getRecentServices(customer: number, project?: number) {
    const projectSpecificServices = this.getRecentEntries()
      .filter((e) => e.customerId === customer && e.projectId === project)
      .map((e) => e.serviceId);
    const customerSpecificServices = this.getRecentEntries()
      .filter((e) => e.customerId === customer)
      .map((e) => e.serviceId);
    const allServices = this.getRecentEntries().map((e) => e.serviceId);
    const uniqueServiceIds = Array.from(
      new Set([
        ...projectSpecificServices,
        ...customerSpecificServices,
        ...allServices,
      ])
    );

    return uniqueServiceIds;
  }

  clearRecents() {
    this.stateStorage.update("recentEntries", []);
  }
}
