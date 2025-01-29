import assert from "assert";
import { SecretsRepository } from "../secretsRepository";
import { DummySecretStorage } from "./dummies";

suite("SecretsRepository", () => {
  test("clockodo login data", async () => {
    const storage = new DummySecretStorage();
    const secretsRepository = new SecretsRepository(storage);

    assert.deepEqual(await secretsRepository.getClockodoLogin(), undefined);
    secretsRepository.storeClockodoLogin({ apiKey: "123", email: "test" });
    assert.deepEqual(await secretsRepository.getClockodoLogin(), {
      apiKey: "123",
      email: "test",
    });
    secretsRepository.removeClockodoLogin();
    assert.deepEqual(await secretsRepository.getClockodoLogin(), undefined);
  });
});
