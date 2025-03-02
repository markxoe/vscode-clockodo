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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runningDummy1: ClockodoTypes.EntryTime = {
  id: 1,
  type: ClockodoTypes.EntryType.TimeEntry,
  customers_id: 1,
  services_id: 2,
  projects_id: 3,
  users_id: 1,
  billable: ClockodoTypes.EntryBillable.Billable,
  clocked: true,
  clocked_offline: false,
  offset: 0,
  time_since: "2021-01-01T00:00:00Z",
};

const runningDummy2: ClockodoTypes.EntryTime = {
  ...runningDummy1,
  id: 2,
  customers_id: 4,
  services_id: 5,
  projects_id: 6,
  time_since: "2021-01-02T00:00:00Z",
  text: "test",
};

suite("TimerManager", () => {
  let mock: axiosMock;
  let secretStorage: DummySecretStorage;
  let secretsRepository: SecretsRepository;
  let authService: AuthService;
  let timerManager: TimerManager;

  let changeEventCounter: number = 0;
  let changeEventData: ClockodoTypes.EntryTime | undefined = undefined;

  beforeEach(() => {
    mock = new axiosMock(axios);

    secretStorage = new DummySecretStorage();
    secretsRepository = new SecretsRepository(secretStorage);
    authService = new AuthService(secretsRepository);
    timerManager = new TimerManager(authService, 0.01);

    timerManager.on("change", (e) => {
      changeEventCounter++;
      changeEventData = e;
    });
  });
  afterEach(() => {
    mock.restore();
    timerManager.dispose();
    changeEventCounter = 0;
    changeEventData = undefined;
  });

  test("Initial load, login later", async () => {
    mock
      .onGet("https://my.clockodo.com/api/v2/clock", {})
      .reply(200, { running: undefined });

    assert.equal(changeEventCounter, 0);
    assert.equal(timerManager.isLoaded(), false);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);

    timerManager.registerCallbacks();
    await timerManager.init();

    assert.equal(changeEventCounter, 0);
    assert.equal(changeEventData, undefined);
    assert.equal(timerManager.isLoaded(), false);
    assert.equal(timerManager.isRunning(), false);

    await authService.login("test", "test");

    // login event is async, we just wait a few ms for the "reloadActivity" to be called
    await delay(10);

    assert.equal(changeEventCounter, 1);
    assert.equal(changeEventData, undefined);
    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), false);
  });

  test("Initial load with stopped clock", async () => {
    mock
      .onGet("https://my.clockodo.com/api/v2/clock", {})
      .reply(200, { running: undefined });

    authService.login("test", "test");

    assert.equal(changeEventCounter, 0);
    assert.equal(timerManager.isLoaded(), false);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);

    timerManager.registerCallbacks();
    await timerManager.init();

    assert.equal(changeEventCounter, 1);
    assert.equal(changeEventData, undefined);
    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), false);
  });

  test("Initial load with running clock", async () => {
    authService.login("test", "test");

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: runningDummy1 });

    assert.strictEqual(timerManager.isLoaded(), false);

    timerManager.registerCallbacks();
    await timerManager.init();

    assert.equal(changeEventCounter, 1);
    assert.deepEqual(changeEventData, runningDummy1);

    assert.strictEqual(timerManager.isLoaded(), true);
    assert.strictEqual(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy1);
  });

  test("Clock is changed outside", async () => {
    authService.login("test", "test");

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: runningDummy1 });

    assert.equal(timerManager.isLoaded(), false);

    let changeCounter = 0;
    let lastChange: ClockodoTypes.EntryTime | undefined = undefined;
    timerManager.on("change", (e) => {
      changeCounter++;
      lastChange = e;
    });

    timerManager.registerCallbacks();
    await timerManager.init();

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy1);
    assert.equal(changeCounter, 1);
    assert.deepEqual(lastChange, runningDummy1);

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: runningDummy2 });

    await delay(25); // timerManager is set to 25ms

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy2);
    assert.equal(changeCounter, 2);
    assert.deepEqual(lastChange, runningDummy2);
  });

  test("Clock is started outside", async () => {
    authService.login("test", "test");

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: undefined });

    assert.equal(timerManager.isLoaded(), false);

    timerManager.registerCallbacks();
    await timerManager.init();

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);
    assert.equal(changeEventCounter, 1);
    assert.deepEqual(changeEventData, undefined);

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: runningDummy1 });

    await delay(15); // timerManager is set to 10ms, lets wait 15

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy1);
    assert.equal(changeEventCounter, 2);
    assert.deepEqual(changeEventData, runningDummy1);
  });

  test("Clock is stopped outside", async () => {
    authService.login("test", "test");

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: runningDummy1 });

    assert.equal(timerManager.isLoaded(), false);

    timerManager.registerCallbacks();
    await timerManager.init();

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy1);
    assert.equal(changeEventCounter, 1);
    assert.deepEqual(changeEventData, runningDummy1);

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: undefined });

    await delay(15); // timerManager autoreload is set to 10ms, lets wait 15

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);
    assert.equal(changeEventCounter, 2);
    assert.deepEqual(changeEventData, undefined);
  });

  test("Start clock", async () => {
    authService.login("test", "test");

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: undefined });

    timerManager.registerCallbacks();
    await timerManager.init();

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);
    assert.equal(changeEventCounter, 1);
    assert.deepEqual(changeEventData, undefined);

    let requestData: any;
    mock.onPost("https://my.clockodo.com/api/v2/clock").reply(({ data }) => {
      requestData = JSON.parse(data);
      return [
        200,
        {
          running: runningDummy1,
        },
      ];
    });

    await timerManager.startClock({
      customers_id: 1,
      projects_id: 2,
      services_id: 3,
      text: "test",
    });

    assert.deepEqual(requestData, {
      customers_id: 1,
      projects_id: 2,
      services_id: 3,
      text: "test",
    });

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy1);
    assert.equal(changeEventCounter, 2);
    assert.deepEqual(changeEventData, runningDummy1);
  });

  test("Stop clock", async () => {
    authService.login("test", "test");

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: runningDummy1 });

    timerManager.registerCallbacks();
    await timerManager.init();

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);

    let calls = 0;
    mock
      .onDelete(`https://my.clockodo.com/api/v2/clock/${runningDummy1.id}`)
      .reply(() => {
        calls++;
        return [
          200,
          {
            stopped: runningDummy1,
            running: undefined,
          },
        ];
      });

    await timerManager.stopClock();

    assert.equal(calls, 1);

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);
    assert.equal(changeEventCounter, 2);
    assert.deepEqual(changeEventData, undefined);
  });

  test("Restart clock", async () => {
    authService.login("test", "test");

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: runningDummy1 });

    timerManager.registerCallbacks();
    await timerManager.init();

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy1);
    assert.equal(changeEventCounter, 1);
    assert.deepEqual(changeEventData, runningDummy1);

    let requestData: any;
    mock.onPost("https://my.clockodo.com/api/v2/clock").reply(({ data }) => {
      requestData = JSON.parse(data);
      return [
        200,
        {
          running: runningDummy2,
        },
      ];
    });

    await timerManager.startClock({
      customers_id: runningDummy2.customers_id,
      projects_id: runningDummy2.projects_id!,
      services_id: runningDummy2.services_id,
      text: runningDummy2.text,
    });

    assert.deepEqual(requestData, {
      customers_id: runningDummy2.customers_id,
      projects_id: runningDummy2.projects_id!,
      services_id: runningDummy2.services_id,
      text: runningDummy2.text,
    });

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy2);
    assert.equal(changeEventCounter, 2);
    assert.deepEqual(changeEventData, runningDummy2);
  });

  test("Logout with running clock", async () => {
    authService.login("test", "test");

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: runningDummy1 });

    timerManager.registerCallbacks();
    await timerManager.init();

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy1);
    assert.equal(changeEventCounter, 1);
    assert.deepEqual(changeEventData, runningDummy1);

    await authService.logout();

    assert.equal(timerManager.isLoaded(), false);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);
    assert.equal(changeEventCounter, 2);
    assert.deepEqual(changeEventData, undefined);
  });

  test("Start clock while logged out", async () => {
    assert.equal(timerManager.isLoaded(), false);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);
    assert.equal(changeEventCounter, 0);
    assert.deepEqual(changeEventData, undefined);

    let requestData: any = undefined;
    mock.onPost("https://my.clockodo.com/api/v2/clock").reply(({ data }) => {
      requestData = JSON.parse(data);
      return [200, {}];
    });

    let res = await timerManager.startClock({
      customers_id: 1,
      projects_id: 2,
      services_id: 3,
      text: "test",
    });
    assert.equal(res, false);

    assert.equal(requestData, undefined);

    assert.equal(timerManager.isLoaded(), false);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);
    assert.equal(changeEventCounter, 0);
    assert.deepEqual(changeEventData, undefined);
  });

  test("Stop clock while logged out", async () => {
    assert.equal(timerManager.isLoaded(), false);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);
    assert.equal(changeEventCounter, 0);
    assert.deepEqual(changeEventData, undefined);

    let res = await timerManager.stopClock();
    assert.equal(res, false);

    assert.equal(timerManager.isLoaded(), false);
    assert.equal(timerManager.isRunning(), false);
    assert.deepEqual(timerManager.getCurrentEntry(), undefined);
    assert.equal(changeEventCounter, 0);
    assert.deepEqual(changeEventData, undefined);
  });

  test("Stop clock with auth error", async () => {
    authService.login("test", "test");

    mock
      .onGet("https://my.clockodo.com/api/v2/clock")
      .reply(200, { running: runningDummy1 });

    timerManager.registerCallbacks();
    await timerManager.init();

    let invalidLoginDataCalls = 0;
    timerManager.on("invalidLoginData", () => {
      invalidLoginDataCalls++;
    });

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy1);
    assert.equal(changeEventCounter, 1);
    assert.deepEqual(changeEventData, runningDummy1);

    mock
      .onDelete(`https://my.clockodo.com/api/v2/clock/${runningDummy1.id}`)
      .reply(401, {});

    let res = await timerManager.stopClock();
    assert.equal(res, false);

    assert.equal(invalidLoginDataCalls, 1);

    assert.equal(timerManager.isLoaded(), true);
    assert.equal(timerManager.isRunning(), true);
    assert.deepEqual(timerManager.getCurrentEntry(), runningDummy1);
    assert.equal(changeEventCounter, 1);
    assert.deepEqual(changeEventData, runningDummy1);
  });
});
