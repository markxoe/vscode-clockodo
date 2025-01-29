import {
  ExtensionContext,
  window,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  EventEmitter,
  TreeView,
} from "vscode";
import { ClockoDoRepository } from "./clockodoRepository";
import { AuthService } from "./authService";

export interface DataProviderEntry {
  name: string;
  customer_id?: number;
  project_id?: number;
  kind: "Loading" | "Login" | "Project" | "Customer";
}

class DataProvider implements TreeDataProvider<DataProviderEntry> {
  private clockodoRepository: ClockoDoRepository;
  private loggedIn?: boolean;

  constructor(clockodoRepository: ClockoDoRepository) {
    this.clockodoRepository = clockodoRepository;
  }

  async getChildren(element?: DataProviderEntry): Promise<DataProviderEntry[]> {
    if (!this.clockodoRepository.dataLoaded() && this.loggedIn === undefined) {
      if (element) {
        return [];
      }
      return [{ name: "Loading...", kind: "Loading" }];
    }

    if (!this.loggedIn) {
      if (element) {
        return [];
      }
      return [{ name: "Please log in", kind: "Login" }];
    }

    if (element && element.kind === "Customer") {
      return (await this.clockodoRepository.getProjects())
        .filter((p) => p.customers_id === element.customer_id)
        .map((p) => ({
          name: p.name,
          project_id: p.id,
          customer_id: element.customer_id,
          kind: "Project",
        }));
    }

    return (await this.clockodoRepository.getCustomers()).map((c) => ({
      name: c.name,
      customer_id: c.id,
      kind: "Customer",
    }));
  }

  getTreeItem(element: DataProviderEntry): TreeItem | Thenable<TreeItem> {
    let item = new TreeItem(
      element.name,
      element.kind === "Customer"
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );

    if (element.kind === "Login") {
      item.command = {
        command: "unofficial-clockodo.login",
        title: "Login",
      };
    }

    item.contextValue = element.kind;

    return item;
  }

  private _onDidChangeTreeData: EventEmitter<void> = new EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setLoggedIn(loggedIn: boolean) {
    this.loggedIn = loggedIn;
    this.refresh();
  }
}

// todo: rename
export class CustomersView {
  private id = "unofficial-clockodo.customers";

  private dataProvider: DataProvider;

  private treeView: TreeView<DataProviderEntry>;

  constructor(
    context: ExtensionContext,
    authService: AuthService,
    clockodoRepository: ClockoDoRepository
  ) {
    this.dataProvider = new DataProvider(clockodoRepository);

    this.treeView = window.createTreeView(this.id, {
      treeDataProvider: this.dataProvider,
      canSelectMany: false,
    });

    clockodoRepository.registerOnDataLoaded(() => {
      this.dataProvider.refresh();
    });

    authService.on("change", (credentials) => {
      this.dataProvider.setLoggedIn(!!credentials);
    });

    context.subscriptions.push(this.treeView);
  }
}
