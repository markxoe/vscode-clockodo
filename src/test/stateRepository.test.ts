import assert from "assert";
import { StateRepository } from "../stateRepository";
import { DummyStateStorage } from "./dummies";
import { beforeEach } from "mocha";

suite("StateRepository", () => {
  let stateRepository: StateRepository;
  beforeEach(() => {
    stateRepository = new StateRepository(new DummyStateStorage());
    stateRepository.clearRecents();
  });

  test("Initially 0 entries", async () => {
    assert.strictEqual(stateRepository.getRecentEntries().length, 0);
    assert.strictEqual(stateRepository.getRecentCustomers().length, 0);
    assert.strictEqual(stateRepository.getRecentProjects(0).length, 0);
    assert.strictEqual(stateRepository.getRecentServices(0, 0).length, 0);
  });

  test("Add single entry", async () => {
    stateRepository.addRecentEntry(1, 2, 3, "test");

    assert.deepStrictEqual(stateRepository.getRecentEntries(), [
      { customerId: 1, serviceId: 2, projectId: 3, text: "test" },
    ]);
    assert.deepStrictEqual(stateRepository.getRecentCustomers(), [1]);
    assert.deepStrictEqual(stateRepository.getRecentProjects(1), [3]);
    assert.deepStrictEqual(stateRepository.getRecentServices(1, 3), [2]);
  });

  test("Different entries are not deduplicated", async () => {
    stateRepository.addRecentEntry(1, 2, 3, "test");
    stateRepository.addRecentEntry(2, 2, 3, "test");
    stateRepository.addRecentEntry(1, 3, 3, "test");
    stateRepository.addRecentEntry(1, 2, 4, "test");
    stateRepository.addRecentEntry(1, 2, 3, "rofl");
    stateRepository.addRecentEntry(1, 2, 3);
    stateRepository.addRecentEntry(2, 2);

    assert.deepStrictEqual(stateRepository.getRecentEntries(), [
      { customerId: 2, serviceId: 2, projectId: undefined, text: undefined },
      { customerId: 1, serviceId: 2, projectId: 3, text: undefined },
      { customerId: 1, serviceId: 2, projectId: 3, text: "rofl" },
      { customerId: 1, serviceId: 2, projectId: 4, text: "test" },
      { customerId: 1, serviceId: 3, projectId: 3, text: "test" },
      { customerId: 2, serviceId: 2, projectId: 3, text: "test" },
      { customerId: 1, serviceId: 2, projectId: 3, text: "test" },
    ]);
    assert.deepStrictEqual(stateRepository.getRecentCustomers(), [2, 1]);
    assert.deepStrictEqual(stateRepository.getRecentProjects(1), [3, 4]);
    assert.deepStrictEqual(stateRepository.getRecentProjects(2), [
      undefined,
      3,
    ]);
    assert.deepStrictEqual(stateRepository.getRecentServices(1, 3), [2, 3]);
  });

  test("Same entries are deduplicated and sorted", async () => {
    stateRepository.addRecentEntry(1, 2, 3, "test");
    stateRepository.addRecentEntry(0, 0, 0, "other");
    stateRepository.addRecentEntry(1, 2, 3, "test");

    assert.deepStrictEqual(stateRepository.getRecentEntries(), [
      { customerId: 1, serviceId: 2, projectId: 3, text: "test" },
      { customerId: 0, serviceId: 0, projectId: 0, text: "other" },
    ]);
    assert.deepStrictEqual(stateRepository.getRecentCustomers(), [1, 0]);
    assert.deepStrictEqual(stateRepository.getRecentProjects(1), [3]);
    assert.deepStrictEqual(stateRepository.getRecentProjects(0), [0]);
    assert.deepStrictEqual(stateRepository.getRecentServices(1, 3), [2, 0]);
    assert.deepStrictEqual(stateRepository.getRecentServices(0, 0), [0, 2]);
  });

  test("All in one test", () => {
    stateRepository.addRecentEntry(1, 2, 3, "1");
    stateRepository.addRecentEntry(4, 5, 6, "2");
    stateRepository.addRecentEntry(7, 8, 9, "3");
    stateRepository.addRecentEntry(7, 8, 3, "3");
    stateRepository.addRecentEntry(1, 2, 3, "3");
    stateRepository.addRecentEntry(1, 2, 3, "1");
    stateRepository.addRecentEntry(4, 0, undefined, "2");

    const entries = stateRepository.getRecentEntries();
    assert.deepStrictEqual(entries, [
      { customerId: 4, serviceId: 0, projectId: undefined, text: "2" },
      { customerId: 1, serviceId: 2, projectId: 3, text: "1" },
      { customerId: 1, serviceId: 2, projectId: 3, text: "3" },
      { customerId: 7, serviceId: 8, projectId: 3, text: "3" },
      { customerId: 7, serviceId: 8, projectId: 9, text: "3" },
      { customerId: 4, serviceId: 5, projectId: 6, text: "2" },
    ]);
    assert.deepStrictEqual(stateRepository.getRecentCustomers(), [4, 1, 7]);
    assert.deepStrictEqual(stateRepository.getRecentProjects(1), [3]);
    assert.deepStrictEqual(stateRepository.getRecentProjects(4), [
      undefined,
      6,
    ]);
    assert.deepStrictEqual(stateRepository.getRecentProjects(7), [3, 9]);
    assert.deepStrictEqual(
      stateRepository.getRecentServices(1, 3),
      [2, 0, 8, 5],
      "Services(1, 3)"
    );
    assert.deepStrictEqual(
      stateRepository.getRecentServices(4, 6),
      [5, 0, 2, 8],
      "Services(4, 6)"
    );
    assert.deepStrictEqual(
      stateRepository.getRecentServices(7, 9),
      [8, 0, 2, 5],
      "Services(7, 9)"
    );
    assert.deepStrictEqual(
      stateRepository.getRecentServices(7, 3),
      [8, 0, 2, 5],
      "Services(7, 3)"
    );
    assert.deepStrictEqual(
      stateRepository.getRecentServices(4, undefined),
      [0, 5, 2, 8],
      "Services(4, undefined)"
    );
  });

  test("Entries with and without project_id are reordered correctly", () => {
    stateRepository.addRecentEntry(1, 7, 8);
    stateRepository.addRecentEntry(1, 7, undefined);
    stateRepository.addRecentEntry(2, 5, undefined);
    stateRepository.addRecentEntry(2, 5, 9);

    stateRepository.addRecentEntry(1, 7, 8);
    stateRepository.addRecentEntry(1, 7, undefined);
    stateRepository.addRecentEntry(2, 5, undefined);
    stateRepository.addRecentEntry(2, 5, 9);

    assert.deepStrictEqual(stateRepository.getRecentEntries(), [
      { customerId: 2, serviceId: 5, projectId: 9, text: undefined },
      { customerId: 2, serviceId: 5, projectId: undefined, text: undefined },
      { customerId: 1, serviceId: 7, projectId: undefined, text: undefined },
      { customerId: 1, serviceId: 7, projectId: 8, text: undefined },
    ]);
  });

  test("Recent services contains project-specific services and all services", () => {
    stateRepository.addRecentEntry(1, 7, 8);

    stateRepository.addRecentEntry(1, 2, 3, "1");
    stateRepository.addRecentEntry(1, 3, 3, "1");
    stateRepository.addRecentEntry(0, 1, 0);
    stateRepository.addRecentEntry(1, 5, 3, "1");
    stateRepository.addRecentEntry(0, 6, 0);

    assert.deepStrictEqual(
      stateRepository.getRecentServices(1, 3),
      [5, 3, 2, 7, 6, 1]
    );
    assert.deepStrictEqual(
      stateRepository.getRecentServices(0, 0),
      [6, 1, 5, 3, 2, 7]
    );

    // (yet) non-existing project
    assert.deepStrictEqual(
      stateRepository.getRecentServices(1, 0),
      [5, 3, 2, 7, 6, 1]
    );

    assert.deepStrictEqual(stateRepository.getRecentCustomers(), [0, 1]);
    assert.deepStrictEqual(stateRepository.getRecentProjects(1), [3, 8]);
    assert.deepStrictEqual(stateRepository.getRecentProjects(0), [0]);
  });
});
