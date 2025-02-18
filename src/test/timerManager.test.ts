import assert from "assert";
import { StateRepository } from "../stateRepository";
import { DummySecretStorage, DummyStateStorage } from "./dummies";
import axiosMock from "axios-mock-adapter";
import axios from "axios";
import { TimerManager } from "../timerManager";
import { AuthService } from "../authService";
import { SecretsRepository } from "../secretsRepository";
import { afterEach, beforeEach } from "mocha";
import { ClockodoTypes } from "../libs/api/types/entry";

suite("TimerManager", () => {
  let mock: axiosMock;
  let secretStorage: DummySecretStorage;
  let secretsRepository: SecretsRepository;
  let authService: AuthService;
  let timerManager: TimerManager;

  beforeEach(() => {
    mock = new axiosMock(axios);

    secretStorage = new DummySecretStorage();
    secretsRepository = new SecretsRepository(secretStorage);
    authService = new AuthService(secretsRepository);
    timerManager = new TimerManager(authService, 1000);
  });
  afterEach(() => {
    mock.restore();

    timerManager.dispose();
  });

  test("Initial load with stopped clock", async () => {
    mock
      .onGet("https://my.clockodo.com/api/v2/clock", {})
      .reply(200, { running: undefined });

    authService.login("test", "test");

    let changeEvent: boolean = false;
    timerManager.on("change", () => {
      changeEvent = true;
    });

    assert.strictEqual(timerManager.isLoaded(), false);
    assert.strictEqual(timerManager.isRunning(), false);
    assert.strictEqual(timerManager.getCurrentEntry(), undefined);

    timerManager.init();
    timerManager.registerCallbacks();

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.strictEqual(changeEvent, true);
    assert.strictEqual(timerManager.isLoaded(), true);
    assert.strictEqual(timerManager.isRunning(), false);
  });

  test("Initial load with running clock", async () => {
    authService.login("test", "test");

    const running: ClockodoTypes.EntryTime = {
      id: 1,
      type: ClockodoTypes.EntryType.TimeEntry,
      customers_id: 1,
      services_id: 1,
      users_id: 1,
      billable: ClockodoTypes.EntryBillable.Billable,
      clocked: true,
      clocked_offline: false,
      offset: 0,
      time_since: "2021-01-01T00:00:00Z",
    };

    mock
      .onGet("https://my.clockodo.com/api/v2/clock", {})
      .reply(200, { running });

    let changeEvent: ClockodoTypes.EntryTime | undefined = undefined;
    timerManager.on("change", (e) => {
      changeEvent = e;
    });

    assert.strictEqual(timerManager.isLoaded(), false);

    timerManager.init();
    timerManager.registerCallbacks();

    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.deepEqual(changeEvent, running);
    assert.strictEqual(timerManager.isLoaded(), true);
    assert.strictEqual(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), running);
  });
});
