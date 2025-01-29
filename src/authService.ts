import EventEmitter from "events";
import { SecretsRepository } from "./secretsRepository";
import { ClockodoLoginData } from "./libs/api/axios";
import { window } from "vscode";

export interface CredentialProviderIntf {
  getCredentials(): ClockodoLoginData | undefined;
  isLoggedIn(): boolean;
  on(
    event: "login" | "logout" | "change",
    listener: (credentials?: ClockodoLoginData) => void
  ): void;
}

export class AuthService implements CredentialProviderIntf {
  private secretsRepository: SecretsRepository;
  private eventEmitter: EventEmitter;
  private credentials?: ClockodoLoginData;

  constructor(secretsRepository: SecretsRepository) {
    this.secretsRepository = secretsRepository;
    this.eventEmitter = new EventEmitter();
  }

  async init() {
    this.credentials = await this.secretsRepository.getClockodoLogin();
    if (this.credentials) {
      this.eventEmitter.emit("login", this.credentials);
      this.eventEmitter.emit("change", this.credentials);
    }
  }

  async login(email: string, apiKey: string) {
    this.credentials = { email, apiKey };
    this.secretsRepository.storeClockodoLogin(this.credentials);
    this.eventEmitter.emit("login", this.credentials);
    this.eventEmitter.emit("change", this.credentials);
  }

  async logout() {
    this.credentials = undefined;
    this.secretsRepository.removeClockodoLogin();
    this.eventEmitter.emit("logout");
    this.eventEmitter.emit("change", this.credentials);
  }

  getCredentials() {
    return this.credentials;
  }

  isLoggedIn() {
    return !!this.credentials;
  }

  on(
    event: "login" | "logout" | "change",
    listener: (credentials?: ClockodoLoginData) => void
  ) {
    this.eventEmitter.on(event, listener);
  }
}
