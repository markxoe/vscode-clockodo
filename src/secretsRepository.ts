import { ExtensionContext } from "vscode";
import { ClockodoLoginData } from "./libs/api/axios";

export interface SecretStorageInterface {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
}

export class VSCodeSecretStorage implements SecretStorageInterface {
  private context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  get(key: string): Thenable<string | undefined> {
    return this.context.secrets.get(key);
  }
  store(key: string, value: string): Thenable<void> {
    return this.context.secrets.store(key, value);
  }
  delete(key: string): Thenable<void> {
    return this.context.secrets.delete(key);
  }
}

export class SecretsRepository {
  private logindata_key = "clockodo_login_data";

  private storage: SecretStorageInterface;

  constructor(storage: SecretStorageInterface) {
    this.storage = storage;
  }

  async getClockodoLogin(): Promise<ClockodoLoginData | undefined> {
    const loginData = await this.storage.get(this.logindata_key);
    if (!loginData) {
      return undefined;
    }

    const loginDataSplit = loginData.split(";");

    if (loginDataSplit.length !== 2) {
      return undefined;
    }

    return {
      email: loginDataSplit[0],
      apiKey: loginDataSplit[1],
    };
  }

  async storeClockodoLogin(data: ClockodoLoginData) {
    await this.storage.store(
      this.logindata_key,
      `${data.email};${data.apiKey}`
    );
  }

  async removeClockodoLogin() {
    await this.storage.delete(this.logindata_key);
  }
}
