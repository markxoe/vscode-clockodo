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
      this.currentClockEntry = undefined;
    });
  }

  init() {
    this.reloadActivity();

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

    if (entryBefore && !this.currentClockEntry) {
      this.eventEmitter.emit("stop", entryBefore);
      this.eventEmitter.emit("change", this.currentClockEntry);
    } else if (!entryBefore && this.currentClockEntry) {
      this.eventEmitter.emit("start", this.currentClockEntry);
      this.eventEmitter.emit("change", this.currentClockEntry);
    }

    // Entry changed (either new entry or edited entry)
    if (
      entryBefore &&
      this.currentClockEntry &&
      ClockodoTypes.entryDiffers(entryBefore, this.currentClockEntry)
    ) {
      this.eventEmitter.emit("change", this.currentClockEntry);
    }

    if (!this.loaded) {
      this.eventEmitter.emit("change", this.currentClockEntry);
    }

    this.loaded = true;
  }

  async editClockDuration(time_since: string, time_since_before: string) {
    if (!this.credentialProvider.isLoggedIn()) {
      return;
    }

    if (!this.currentClockEntry) {
      return;
    }

    const ret = await ClockodoClock.clockEdit(
      this.credentialProvider.getCredentials()!,
      this.currentClockEntry!.id,
      time_since,
      time_since_before
    ).catch((err: AxiosError) => this.axiosErrorHandler(err));

    if (!ret) {
      return;
    }

    this.currentClockEntry = ret.data.updated;
    this.eventEmitter.emit("change", this.currentClockEntry);
  }

  on(
    event: "start" | "stop" | "change" | "invalidLoginData",
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
}
