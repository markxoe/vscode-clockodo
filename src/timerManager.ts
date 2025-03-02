import { EventEmitter } from "events";
import { CredentialProviderIntf } from "./authService";
import { ClockodoTypes } from "./libs/api/types/entry";
import { ClockodoClock } from "./libs/api/clock";
import { AxiosError } from "axios";
import { Disposable, window } from "vscode";

export class TimerManager implements Disposable {
  private eventEmitter: EventEmitter;
  private credentialProvider: CredentialProviderIntf;

  private autoFetchHandle?: NodeJS.Timeout;
  private autoFetchInterval: number;

  private currentClockEntry?: ClockodoTypes.EntryTime;
  private loaded: boolean = false;

  // Autofetch interval in seconds
  constructor(
    credentialProvider: CredentialProviderIntf,
    autoFetchInterval: number
  ) {
    this.eventEmitter = new EventEmitter();
    this.credentialProvider = credentialProvider;
    this.autoFetchInterval = autoFetchInterval;
  }

  registerCallbacks() {
    this.credentialProvider.on("login", () => {
      this.loaded = false;
      this.reloadActivity();
    });
    this.credentialProvider.on("logout", () => {
      this.loaded = false;
      let beforeRunning = !!this.currentClockEntry;

      this.currentClockEntry = undefined;

      if (beforeRunning) {
        this.eventEmitter.emit("change", undefined);
      }
    });
  }

  async init() {
    await this.reloadActivity();

    if (this.autoFetchInterval > 0) {
      this.autoFetchHandle = setInterval(async () => {
        await this.reloadActivity();
      }, this.autoFetchInterval * 1000);
    }
  }

  dispose() {
    if (this.autoFetchHandle) {
      clearInterval(this.autoFetchHandle);
    }
  }

  private axiosErrorHandler(err: AxiosError) {
    if (err.response?.status === 401) {
      this.eventEmitter.emit("invalidLoginData");
    } else {
      window.showErrorMessage(`Error fetching clock: ${err.message}`);
    }

    return undefined;
  }

  async reloadActivity() {
    if (!this.credentialProvider.isLoggedIn()) {
      return;
    }

    const result = await ClockodoClock.clockGet(
      this.credentialProvider.getCredentials()!
    ).catch((err: AxiosError) => this.axiosErrorHandler(err));

    if (!result) {
      return;
    }

    const entryBefore = this.currentClockEntry;
    this.currentClockEntry = result.data.running;

    const entryBeforePresent = !!entryBefore;
    const entryPresent = !!this.currentClockEntry;
    if (!this.loaded) {
      // initial load
      this.eventEmitter.emit("change", this.currentClockEntry);
      this.loaded = true;
    } else if (entryBeforePresent !== entryPresent) {
      // start/stop
      this.eventEmitter.emit("change", this.currentClockEntry);
    } else if (
      entryBefore &&
      this.currentClockEntry &&
      ClockodoTypes.entryDiffers(entryBefore, this.currentClockEntry)
    ) {
      // entry changed
      this.eventEmitter.emit("change", this.currentClockEntry);
    }
  }

  on(
    event: "change" | "invalidLoginData",
    listener: (entry?: ClockodoTypes.EntryTime) => void
  ) {
    this.eventEmitter.on(event, listener);
  }

  isRunning() {
    return !!this.currentClockEntry;
  }

  isLoaded() {
    return this.loaded;
  }

  getCurrentEntry() {
    return this.currentClockEntry;
  }

  async startClock({
    customers_id,
    projects_id,
    services_id,
    text,
  }: {
    customers_id: number;
    projects_id: number;
    services_id: number;
    text?: string;
  }) {
    if (!this.credentialProvider.isLoggedIn()) {
      return false;
    }

    const res = await ClockodoClock.clockStart(
      this.credentialProvider.getCredentials()!,
      {
        customers_id,
        projects_id,
        services_id,
        text,
      }
    ).catch((err: AxiosError) => this.axiosErrorHandler(err));

    if (!res) {
      return false;
    }

    this.currentClockEntry = res.data.running;
    this.eventEmitter.emit("change", this.currentClockEntry);

    return true;
  }

  async stopClock() {
    if (!this.credentialProvider.isLoggedIn()) {
      return false;
    }

    const res = await ClockodoClock.clockStop(
      this.credentialProvider.getCredentials()!,
      this.currentClockEntry!.id
    ).catch((err: AxiosError) => this.axiosErrorHandler(err));

    if (!res) {
      return false;
    }

    this.currentClockEntry = undefined;
    this.eventEmitter.emit("change", undefined);

    return true;
  }
}
