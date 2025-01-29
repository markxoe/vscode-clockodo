import { ExtensionContext, window } from "vscode";
import { StatusbarController } from "./statusbar";
import { SecretsRepository, VSCodeSecretStorage } from "./secretsRepository";
import { ClockoDoRepository } from "./clockodoRepository";
import { CustomersView } from "./customersView";
import { ActivityView } from "./activityView";
import { StateRepository, VSCodeGlobalStateStorage } from "./stateRepository";
import { Settings } from "./settings";
import { AuthService } from "./authService";
import { TimerManager } from "./timerManager";
import { CommandManager } from "./commandManager";

/**
 * Main controller, registers all other controllers, views and other extension related stuff
 */
export class MainController {
  private secretsRepository: SecretsRepository;
  private authService: AuthService;
  private timerManager: TimerManager;

  private statusBarController: StatusbarController;
  private clockodoRepository: ClockoDoRepository;
  private customersView: CustomersView;
  private activityView: ActivityView;
  private stateRepository: StateRepository;
  private commandManager: CommandManager;

  constructor(context: ExtensionContext) {
    this.secretsRepository = new SecretsRepository(
      new VSCodeSecretStorage(context)
    );
    this.authService = new AuthService(this.secretsRepository);
    this.timerManager = new TimerManager(
      this.authService,
      Settings.getActivityFetchInterval()
    );

    this.statusBarController = new StatusbarController(context);
    this.clockodoRepository = new ClockoDoRepository();
    this.stateRepository = new StateRepository(
      new VSCodeGlobalStateStorage(context)
    );

    this.activityView = new ActivityView(
      context,
      this.clockodoRepository,
      this.timerManager
    );

    this.customersView = new CustomersView(
      context,
      this.authService,
      this.clockodoRepository
    );

    this.commandManager = new CommandManager(
      context,
      this.authService,
      this.timerManager,
      this.stateRepository,
      this.clockodoRepository,
      this.customersView
    );

    this.timerManager.registerCallbacks();

    this.timerManager.on("change", (entry) => {
      this.updateStatusbar();
    });

    this.authService.init();
    this.timerManager.init();

    this.clockodoRepository.registerOnInvalidLoginData(() => {
      this.onInvalidLoginData();
    });

    this.timerManager.on("invalidLoginData", () => {
      this.onInvalidLoginData();
    });

    this.authService.on("login", (credentials) => {
      this.clockodoRepository.onNewLoginData(credentials!);
      this.updateStatusbar();
      this.clockodoRepository.loadCustomers();
      this.clockodoRepository.loadProjects();
    });

    this.authService.on("logout", () => {
      this.clockodoRepository.resetLoginData();
      this.stateRepository.clearRecents();
      this.statusBarController.showMissingLoginData();
    });

    context.subscriptions.push(this.timerManager);
  }

  // Can be called as often as one likes, it will update the statusbar
  private async updateStatusbar() {
    if (this.timerManager.isRunning()) {
      this.statusBarController.showRunningClock(
        this.timerManager.getCurrentEntry()!.time_since
      );
    } else {
      this.statusBarController.showNothingRunning();
    }
  }

  private async onInvalidLoginData() {
    await this.authService.logout();

    window
      .showErrorMessage("Invalid login data. Please login again", "Login")
      .then((value) => {
        if (value === "Login") {
          return this.commandManager.login();
        }
      });
  }
}
