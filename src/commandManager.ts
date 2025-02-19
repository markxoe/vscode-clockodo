import {
  commands,
  ExtensionContext,
  QuickPickItem,
  QuickPickItemKind,
  window,
} from "vscode";
import { AuthService } from "./authService";
import { TimerManager } from "./timerManager";
import { StateRepository } from "./stateRepository";
import { ClockoDoRepository } from "./clockodoRepository";
import { CustomersView, DataProviderEntry } from "./customersView";
import { ClockodoClock } from "./libs/api/clock";
import { AxiosError } from "axios";

export class CommandManager {
  private authService: AuthService;
  private timerManager: TimerManager;
  private stateRepository: StateRepository;
  private customersView: CustomersView;
  private clockodoRepository: ClockoDoRepository;

  constructor(
    context: ExtensionContext,
    authService: AuthService,
    timerManager: TimerManager,
    stateRepository: StateRepository,
    clockodoRepository: ClockoDoRepository,
    customersView: CustomersView
  ) {
    this.authService = authService;
    this.timerManager = timerManager;
    this.stateRepository = stateRepository;
    this.clockodoRepository = clockodoRepository;
    this.customersView = customersView;

    context.subscriptions.push(
      commands.registerCommand("unofficial-clockodo.login", () => this.login()),
      commands.registerCommand("unofficial-clockodo.logout", () =>
        this.logout()
      ),
      commands.registerCommand(
        "unofficial-clockodo.reloadCustomersProjects",
        () => this.reloadCustomersProjectsCmd()
      ),
      commands.registerCommand("unofficial-clockodo.reloadActivity", () =>
        timerManager.reloadActivity()
      ),
      commands.registerCommand("unofficial-clockodo.startClock", (data) =>
        this.startClockCmd(data)
      ),
      commands.registerCommand("unofficial-clockodo.stopClock", () =>
        this.stopClockCmd()
      ),
      commands.registerCommand("unofficial-clockodo.clearRecents", () =>
        stateRepository.clearRecents()
      )
    );
  }

  async login() {
    const email = await window.showInputBox({
      prompt: "Enter your Clockodo E-Mail",
      ignoreFocusOut: true,
    });

    if (!email || !email.includes("@")) {
      window.showErrorMessage("No E-Mail provided");
      return;
    }

    const apiKey = await window.showInputBox({
      prompt: "Enter your Clockodo API Key",
      ignoreFocusOut: true,
    });

    if (!apiKey) {
      window.showErrorMessage("No API Key provided");
      return;
    }

    this.authService.login(email, apiKey);
  }

  private logout() {
    this.authService.logout();
  }

  private generateRecentQuickPickItems<
    LabelKey extends string,
    T extends { id: number } & Record<LabelKey, string>
  >(all: T[], recentIds: number[], labelkey: LabelKey): QuickPickItem[] {
    if (recentIds.length === 0) {
      return all.map((c) => ({
        label: c[labelkey],
      }));
    }

    const recent = recentIds
      .map((id) => all.find((c) => c.id === id))
      .filter((c) => c) as T[];
    const notRecent = all.filter((c) => !recentIds.includes(c.id));

    return [
      {
        label: "Recent",
        kind: QuickPickItemKind.Separator,
      },
      ...recent.map((c) => ({
        label: c[labelkey],
      })),
      {
        label: "Other",
        kind: QuickPickItemKind.Separator,
      },
      ...notRecent.map((c) => ({
        label: c[labelkey],
      })),
    ];
  }

  private async startClockCmd(data?: DataProviderEntry) {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    let project_id: number | undefined = undefined;
    let customer_id: number | undefined = undefined;

    if (!data) {
      const recentEntries = this.stateRepository.getRecentEntries();
      if (recentEntries.length > 0) {
        const customersFut = this.clockodoRepository.getCustomers();
        const projectsFut = this.clockodoRepository.getProjects();
        const servicesFut = this.clockodoRepository.getServices();
        const [customers, projects, services] = await Promise.all([
          customersFut,
          projectsFut,
          servicesFut,
        ]);

        const todo = await window.showQuickPick([
          { label: "New Entry", data: undefined },
          { label: "Recent Entries", kind: QuickPickItemKind.Separator },
          ...recentEntries.map((entry) => {
            const serviceName = services.find(
              (s) => s.id === entry.serviceId
            )?.name;
            const customerName = customers.find(
              (c) => c.id === entry.customerId
            )?.name;
            const projectName = projects.find(
              (p) => p.id === entry.projectId
            )?.name;

            return {
              label: serviceName!, //+ (entry.text ? ` / ${entry.text}` : ""),
              description: entry.text,
              detail: customerName + " / " + projectName,
              data: entry,
            };
          }),
        ]);

        if (todo === undefined) {
          return;
        }

        if (todo.data !== undefined) {
          this.stateRepository.addRecentEntry(
            todo.data.customerId,
            todo.data.serviceId,
            todo.data.projectId,
            todo.data.text
          );

          const res = await this.timerManager.startClock({
            customers_id: todo.data.customerId,
            projects_id: todo.data.projectId!,
            services_id: todo.data.serviceId,
            text: todo.data.text,
          });

          if (res) {
            window.showInformationMessage("Clock started");
          }

          return;
        }
      }
    } else {
      project_id = data.project_id!;
      customer_id = data.customer_id!;
    }

    if (!customer_id) {
      const customers = await this.clockodoRepository.getCustomers();

      const customer = await window
        .showQuickPick(
          this.generateRecentQuickPickItems(
            customers,
            this.stateRepository.getRecentCustomers(),
            "name"
          ),
          {
            canPickMany: false,
            title: "Select a customer",
          }
        )

        .then(async (value) => {
          if (!value) {
            return undefined;
          }
          return customers.find((c) => c.name === value.label);
        });

      if (!customer) {
        return;
      }

      const projects = await this.clockodoRepository.getProjects();

      const project = await window
        .showQuickPick(
          this.generateRecentQuickPickItems(
            projects.filter((p) => p.customers_id === customer!.id),
            this.stateRepository
              .getRecentProjects(customer.id)
              .filter((p) => p !== undefined),
            "name"
          ),
          {
            title: "Select a project",
          }
        )
        .then(async (value) => {
          if (!value) {
            return;
          }
          return projects.find((p) => p.name === value.label);
        });

      if (!project) {
        return;
      }

      project_id = project!.id;
      customer_id = customer!.id;
    }

    if (!project_id || !customer_id) {
      window.showErrorMessage("No project or customer selected");
      return;
    }

    const services = await this.clockodoRepository.getServices();

    const service = await window
      .showQuickPick(
        this.generateRecentQuickPickItems(
          services,
          this.stateRepository.getRecentServices(customer_id, project_id),
          "name"
        ),
        {
          canPickMany: false,
          title: "Select a service",
        }
      )
      .then(async (value) => {
        if (!value) {
          return;
        }
        return services.find((s) => s.name === value.label);
      });

    if (!service) {
      return;
    }

    const description = await window.showInputBox({
      prompt: "Enter an optional description",
      title: "Entry Description",
    });

    this.stateRepository.addRecentEntry(
      customer_id,
      service.id,
      project_id,
      description
    );

    const res = await this.timerManager.startClock({
      customers_id: customer_id!,
      projects_id: project_id!,
      services_id: service!.id,
      text: description?.length ? description : undefined,
    });

    if (res) {
      window.showInformationMessage("Clock started");
    }
  }

  private async stopClockCmd() {
    if (!this.timerManager.isRunning()) {
      window.showErrorMessage("No running clock");
      return;
    }

    if (!this.authService.isLoggedIn()) {
      return;
    }

    const res = await this.timerManager.stopClock();

    if (res) {
      window.showInformationMessage("Clock stopped");
    }
  }

  private reloadCustomersProjectsCmd() {
    this.clockodoRepository.loadCustomers();
    this.clockodoRepository.loadProjects();
  }
}
