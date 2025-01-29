import assert from "assert";
import { SecretsRepository } from "../secretsRepository";
import { AuthService } from "../authService";
import { ClockodoLoginData } from "../libs/api/axios";
import { DummySecretStorage } from "./dummies";

suite("authService", () => {
  test("login & logout", async () => {
    const storage = new DummySecretStorage();
    const secretsRepository = new SecretsRepository(storage);
    const authService = new AuthService(secretsRepository);

    let loginEvents: (ClockodoLoginData | undefined)[] = [];
    let logoutEvents: true[] = [];
    let changeEvents: (ClockodoLoginData | undefined)[] = [];

    authService.on("login", (credentials) => {
      loginEvents.push(credentials);
    });
    authService.on("logout", () => {
      logoutEvents.push(true);
    });
    authService.on("change", (credentials) => {
      changeEvents.push(credentials);
    });

    await authService.init();

    assert.deepEqual(loginEvents, []);
    assert.deepEqual(changeEvents, []);
    assert.deepEqual(logoutEvents, []);

    authService.login("test", "123");
    assert.deepEqual(logoutEvents, []);
    assert.deepEqual(loginEvents, [{ email: "test", apiKey: "123" }]);
    assert.deepEqual(changeEvents, [{ email: "test", apiKey: "123" }]);
    assert.deepEqual(authService.getCredentials(), {
      email: "test",
      apiKey: "123",
    });
    assert.deepEqual(authService.isLoggedIn(), true);

    loginEvents = [];
    changeEvents = [];
    logoutEvents = [];

    authService.logout();
    assert.deepEqual(logoutEvents, [true]);
    assert.deepEqual(changeEvents, [undefined]);
    assert.deepEqual(loginEvents, []);
    assert.deepEqual(authService.getCredentials(), undefined);
    assert.deepEqual(authService.isLoggedIn(), false);
  });

  test("Pre init login", async () => {
    const storage = new DummySecretStorage();
    const secretsRepository = new SecretsRepository(storage);
    const authService = new AuthService(secretsRepository);

    let loginEvents: (ClockodoLoginData | undefined)[] = [];
    let logoutEvents: true[] = [];
    let changeEvents: (ClockodoLoginData | undefined)[] = [];

    authService.on("login", (credentials) => {
      loginEvents.push(credentials);
    });
    authService.on("logout", () => {
      logoutEvents.push(true);
    });
    authService.on("change", (credentials) => {
      changeEvents.push(credentials);
    });

    secretsRepository.storeClockodoLogin({ email: "test", apiKey: "123" });

    await authService.init();

    assert.deepEqual(logoutEvents, []);
    assert.deepEqual(loginEvents, [{ email: "test", apiKey: "123" }]);
    assert.deepEqual(changeEvents, [{ email: "test", apiKey: "123" }]);
    assert.deepEqual(authService.getCredentials(), {
      email: "test",
      apiKey: "123",
    });
    assert.deepEqual(authService.isLoggedIn(), true);
  });
});
