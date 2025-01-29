import {
  EventEmitter,
  ExtensionContext,
  ProviderResult,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeView,
  window,
} from "vscode";

import { ClockoDoRepository } from "./clockodoRepository";
import { TimerManager } from "./timerManager";

export enum ActivityViewDataProviderEntryKind {
  Loading,
  LoggedOut,
  Customer,
  Project,
  Stopped,
  DoStop,
  Description,
}

export interface ActivityViewDataProviderEntry {
  kind: ActivityViewDataProviderEntryKind;
  title?: string;
  description?: string;
}

class ActivityViewDataProvider
  implements TreeDataProvider<ActivityViewDataProviderEntry>
{
  private clockodoRepository: ClockoDoRepository;
  private timerManager: TimerManager;

  private _onDidChangeTreeData: EventEmitter<void> = new EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    clockodoRepository: ClockoDoRepository,
    timerManager: TimerManager
  ) {
    this.clockodoRepository = clockodoRepository;
    this.timerManager = timerManager;

    timerManager.on("change", (entry) => {
      this.refresh();
    });

    clockodoRepository.registerOnDataLoaded(() => {
      this.refresh();
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(
    element?: ActivityViewDataProviderEntry | undefined
  ): Promise<ActivityViewDataProviderEntry[]> {
    if (!this.timerManager.isLoaded()) {
      if (element) {
        return [];
      }
      return [{ kind: ActivityViewDataProviderEntryKind.Loading }];
    }

    if (this.clockodoRepository.isLoggedOut()) {
      if (element) {
        return [];
      }
      return [{ kind: ActivityViewDataProviderEntryKind.LoggedOut }];
    }

    if (!this.clockodoRepository.dataLoaded()) {
      if (element) {
        return [];
      }
      return [{ kind: ActivityViewDataProviderEntryKind.Loading }];
    }

    if (this.timerManager.isRunning()) {
      const currentActivity = this.timerManager.getCurrentEntry()!;

      const customer = (await this.clockodoRepository.getCustomers()).find(
        ({ id }) => id === currentActivity.customers_id
      );
      const project = (await this.clockodoRepository.getProjects()).find(
        ({ id }) => id === currentActivity.projects_id
      );
      const services = (await this.clockodoRepository.getServices()).find(
        ({ id }) => id === currentActivity.services_id
      );

      if (element) {
        return [];
      }
      return [
        {
          kind: ActivityViewDataProviderEntryKind.Customer,
          title: customer!.name,
        },
        {
          kind: ActivityViewDataProviderEntryKind.Project,
          title: project!.name,
        },
        {
          kind: ActivityViewDataProviderEntryKind.Project,
          title: services!.name,
        },
        {
          kind: ActivityViewDataProviderEntryKind.Description,
          description: currentActivity.text ?? "No description",
        },
        { kind: ActivityViewDataProviderEntryKind.DoStop },
      ];
    } else {
      if (element) {
        return [];
      }
      return [{ kind: ActivityViewDataProviderEntryKind.Stopped }];
    }
  }
  getTreeItem(
    element: ActivityViewDataProviderEntry
  ): TreeItem | Thenable<TreeItem> {
    switch (element.kind) {
      case ActivityViewDataProviderEntryKind.Loading:
        return new TreeItem("Loading...");
      case ActivityViewDataProviderEntryKind.LoggedOut:
        return new TreeItem("Please log in");
      case ActivityViewDataProviderEntryKind.Stopped:
        const item = new TreeItem("Start clock");
        item.command = {
          command: "unofficial-clockodo.startClock",
          title: "Start",
        };
        item.iconPath = new ThemeIcon("play");
        return item;
      case ActivityViewDataProviderEntryKind.DoStop:
        const stopItem = new TreeItem("Stop");
        stopItem.command = {
          command: "unofficial-clockodo.stopClock",
          title: "Stop",
        };
        stopItem.iconPath = new ThemeIcon("stop");
        return stopItem;
      case ActivityViewDataProviderEntryKind.Description:
        return new TreeItem(element.description!);
      default:
        return new TreeItem(element.title!);
    }
  }
}

export class ActivityView {
  private id = "unofficial-clockodo.activity";
  private treeView: TreeView<ActivityViewDataProviderEntry>;
  private dataProvider: ActivityViewDataProvider;

  constructor(
    context: ExtensionContext,
    clockodoRepository: ClockoDoRepository,
    timerManager: TimerManager
  ) {
    this.dataProvider = new ActivityViewDataProvider(
      clockodoRepository,
      timerManager
    );
    this.treeView = window.createTreeView(this.id, {
      treeDataProvider: this.dataProvider,
      canSelectMany: false,
    });
    context.subscriptions.push(this.treeView);
  }

  refresh() {
    this.dataProvider.refresh();
  }
}
