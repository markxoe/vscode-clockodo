import { window } from "vscode";
import { ClockodoLoginData } from "./libs/api/axios";
import { getCustomers } from "./libs/api/customers";
import { Customer } from "./libs/api/types/customer";
import { Project } from "./libs/api/types/project";
import { Paging } from "./libs/api/types/pagination";
import { getProjects } from "./libs/api/projects";
import { AxiosError } from "axios";
import { Service } from "./libs/api/types/service";
import { getServices } from "./libs/api/services";

export class ClockoDoRepository {
  private onInvalidLoginDataCb: Array<() => void> = [];
  private onDataLoadedCb: Array<() => void> = [];

  private customers?: Customer[]; // Note: only active customers
  private projects?: Project[]; // Note: only active projects
  private services?: Service[];
  private loginData?: ClockodoLoginData;

  onNewLoginData(loginData: ClockodoLoginData) {
    this.loginData = loginData;
  }

  resetLoginData() {
    this.loginData = undefined;
  }

  isLoggedOut() {
    return !this.loginData;
  }

  dataLoaded() {
    return this.customers && this.projects;
  }

  // On any data loaded
  registerOnDataLoaded(cb: () => void) {
    this.onDataLoadedCb.push(cb);
  }

  private callDataLoadedCb() {
    this.onDataLoadedCb.forEach((cb) => cb());
  }

  registerOnInvalidLoginData(cb: () => void) {
    this.onInvalidLoginDataCb.push(cb);
  }

  async loadPaginated<T>(fn: (page: number) => Promise<[Paging, T[]]>) {
    let page = 0;
    let allData: T[] = [];
    let response: Paging;

    do {
      let [new_response, returnData] = await fn(page + 1).catch(
        (e: AxiosError) => {
          if (e.status === 401) {
            this.onInvalidLoginDataCb.forEach((cb) => cb());
          } else {
            window.showErrorMessage(`Error loading data: ${e.message}`);
          }
          return [undefined, []] as [undefined, T[]];
        }
      ); // pagination at clockodo's api is 1 based

      if (!returnData) {
        return undefined;
      }

      response = new_response!;
      allData = allData.concat(returnData);
      page++;
    } while (page < response.count_pages);

    this.callDataLoadedCb();

    return allData;
  }

  async loadCustomers() {
    if (!this.loginData) {
      this.onInvalidLoginDataCb.forEach((cb) => cb());
      return;
    }

    this.customers = await this.loadPaginated((page) =>
      getCustomers(this.loginData!, page, true).then((r) => [
        r.data.paging,
        r.data.customers,
      ])
    );

    return this.customers;
  }

  async loadProjects() {
    if (!this.loginData) {
      this.onInvalidLoginDataCb.forEach((cb) => cb());
      return;
    }

    this.projects = await this.loadPaginated((page) =>
      getProjects(this.loginData!, page, true).then((r) => [
        r.data.paging,
        r.data.projects,
      ])
    );

    return this.projects;
  }

  async loadServices() {
    if (!this.loginData) {
      this.onInvalidLoginDataCb.forEach((cb) => cb());
      return;
    }

    await getServices(this.loginData!).then((r) => {
      this.services = r.data.services.filter(({ active }) => active);
    });

    this.callDataLoadedCb();

    return this.services;
  }

  async getCustomers() {
    if (!this.customers) {
      await this.loadCustomers();
    }

    if (!this.customers) {
      throw new Error("No customers loaded");
    }

    return this.customers;
  }

  async getProjects() {
    if (!this.projects) {
      await this.loadProjects();
    }

    if (!this.projects) {
      throw new Error("No projects loaded");
    }

    return this.projects;
  }

  async getServices() {
    if (!this.services) {
      await this.loadServices();
    }

    if (!this.services) {
      throw new Error("No services loaded");
    }

    return this.services;
  }
}
