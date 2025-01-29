import { SecretStorageInterface } from "../secretsRepository";

export class DummySecretStorage implements SecretStorageInterface {
  private secrets: Record<string, string | undefined> = {};

  async get(key: string): Promise<string | undefined> {
    return this.secrets[key];
  }
  async store(key: string, value: string) {
    this.secrets[key] = value;
  }
  async delete(key: string) {
    this.secrets[key] = undefined;
  }
}

export class DummyStateStorage {
  private storage: Record<string, any> = {};

  get<T>(key: string, defaultValue: T): T {
    return this.storage[key] ?? defaultValue;
  }
  update<T>(key: string, value: T) {
    this.storage[key] = value;
  }
}
