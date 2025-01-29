import {
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  ThemeColor,
  window,
} from "vscode";

export class StatusbarController {
  private statusBarItem: StatusBarItem;

  private start?: Date = undefined;

  private secondTimerHandle?: ReturnType<typeof setInterval>;

  /**
   * Construct the StatusbarController
   * @param context The extension context; used for registering the disposable
   */
  constructor(context: ExtensionContext) {
    this.statusBarItem = window.createStatusBarItem(
      StatusBarAlignment.Left,
      40
    );

    this.statusBarItem.name = "Clockodo Status";

    context.subscriptions.push(this.statusBarItem);
  }

  hide() {
    this.statusBarItem.hide();
    this.start = undefined;
    if (this.secondTimerHandle) {
      clearInterval(this.secondTimerHandle);
    }
  }

  showMissingLoginData() {
    this.start = undefined;
    if (this.secondTimerHandle) {
      clearInterval(this.secondTimerHandle);
    }

    this.statusBarItem.text = "$(account) Login to Clockodo";
    this.statusBarItem.backgroundColor = new ThemeColor(
      "statusBarItem.errorBackground"
    );
    this.statusBarItem.command = "unofficial-clockodo.login";
    this.statusBarItem.show();
  }

  showNothingRunning() {
    this.start = undefined;
    if (this.secondTimerHandle) {
      clearInterval(this.secondTimerHandle);
    }

    this.statusBarItem.text = "$(play) Start Clockodo";
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.command = "unofficial-clockodo.startClock";
    this.statusBarItem.show();
  }

  private startedToString() {
    let timeSince = Date.now() - this.start!.getTime();
    let hours = Math.floor(timeSince / 1000 / 60 / 60);
    timeSince -= hours * 1000 * 60 * 60;
    let minutes = Math.floor(timeSince / 1000 / 60);
    timeSince -= minutes * 1000 * 60;
    let seconds = Math.floor(timeSince / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  showRunningClock(started: string) {
    this.start = new Date(started);

    this.statusBarItem.text = `$(debug-pause) Clockodo Running ${this.startedToString()}`;
    this.statusBarItem.backgroundColor = new ThemeColor(
      "statusBarItem.warningBackground"
    );
    this.statusBarItem.command = "unofficial-clockodo.stopClock";
    this.statusBarItem.show();

    this.secondTimerHandle = setInterval(() => {
      this.update();
    }, 1000);
  }

  private update() {
    if (this.start) {
      this.statusBarItem.text = `$(debug-pause) Clockodo Running ${this.startedToString()}`;
    }
  }
}
