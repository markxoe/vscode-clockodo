import assert from "assert";
import { StateRepository } from "../stateRepository";
import { DummyStateStorage } from "./dummies";

suite("StateRepository", () => {
  test("Recent projects", async () => {
    const stateRepository = new StateRepository(new DummyStateStorage());
    stateRepository.clearRecents();

    assert.deepEqual(stateRepository.getLastProjects(), []);

    stateRepository.addLastProject(1, 1);
    assert.deepEqual(stateRepository.getLastProjects(), [
      { projectId: 1, customerId: 1 },
    ]);
    assert.deepEqual(stateRepository.getLastProjects(1), [
      { projectId: 1, customerId: 1 },
    ]);
    assert.deepEqual(stateRepository.getLastProjects(2), []);

    stateRepository.addLastProject(2, 1);
    assert.deepEqual(stateRepository.getLastProjects(), [
      { projectId: 2, customerId: 1 },
      { projectId: 1, customerId: 1 },
    ]);
    assert.deepEqual(stateRepository.getLastProjects(1), [
      { projectId: 2, customerId: 1 },
      { projectId: 1, customerId: 1 },
    ]);
    assert.deepEqual(stateRepository.getLastProjects(2), []);

    stateRepository.addLastProject(3, 2);
    assert.deepEqual(stateRepository.getLastProjects(), [
      { projectId: 3, customerId: 2 },
      { projectId: 2, customerId: 1 },
      { projectId: 1, customerId: 1 },
    ]);
    assert.deepEqual(stateRepository.getLastProjects(1), [
      { projectId: 2, customerId: 1 },
      { projectId: 1, customerId: 1 },
    ]);
    assert.deepEqual(stateRepository.getLastProjects(2), [
      { projectId: 3, customerId: 2 },
    ]);

    // Adding the same project again should move it to the top
    stateRepository.addLastProject(1, 1);
    assert.deepEqual(stateRepository.getLastProjects(), [
      { projectId: 1, customerId: 1 },
      { projectId: 3, customerId: 2 },
      { projectId: 2, customerId: 1 },
    ]);
    assert.deepEqual(stateRepository.getLastProjects(1), [
      { projectId: 1, customerId: 1 },
      { projectId: 2, customerId: 1 },
    ]);
    assert.deepEqual(stateRepository.getLastProjects(2), [
      { projectId: 3, customerId: 2 },
    ]);

    stateRepository.addLastProject(4, 2);
    assert.deepEqual(stateRepository.getLastProjects(), [
      { projectId: 4, customerId: 2 },
      { projectId: 1, customerId: 1 },
      { projectId: 3, customerId: 2 },
      { projectId: 2, customerId: 1 },
    ]);
    assert.deepEqual(stateRepository.getLastProjects(1), [
      { projectId: 1, customerId: 1 },
      { projectId: 2, customerId: 1 },
    ]);
    assert.deepEqual(stateRepository.getLastProjects(2), [
      { projectId: 4, customerId: 2 },
      { projectId: 3, customerId: 2 },
    ]);
  });

  test("Recent customers", async () => {
    const stateRepository = new StateRepository(new DummyStateStorage());
    stateRepository.clearRecents();

    assert.deepEqual(stateRepository.getLastCustomers(), []);

    stateRepository.addLastCustomer(1);
    assert.deepEqual(stateRepository.getLastCustomers(), [1]);

    stateRepository.addLastCustomer(2);
    assert.deepEqual(stateRepository.getLastCustomers(), [2, 1]);

    stateRepository.addLastCustomer(3);
    assert.deepEqual(stateRepository.getLastCustomers(), [3, 2, 1]);

    // Adding the same customer again should move it to the top
    stateRepository.addLastCustomer(1);
    assert.deepEqual(stateRepository.getLastCustomers(), [1, 3, 2]);

    stateRepository.addLastCustomer(4);
    assert.deepEqual(stateRepository.getLastCustomers(), [4, 1, 3, 2]);
  });

  test("Recent services", async () => {
    const stateRepository = new StateRepository(new DummyStateStorage());
    stateRepository.clearRecents();

    assert.deepEqual(stateRepository.getLastServices(), []);

    stateRepository.addLastService(1);
    assert.deepEqual(stateRepository.getLastServices(), [1]);

    stateRepository.addLastService(2);
    assert.deepEqual(stateRepository.getLastServices(), [2, 1]);

    stateRepository.addLastService(3);
    assert.deepEqual(stateRepository.getLastServices(), [3, 2, 1]);

    // Adding the same service again should move it to the top
    stateRepository.addLastService(1);
    assert.deepEqual(stateRepository.getLastServices(), [1, 3, 2]);

    stateRepository.addLastService(4);
    assert.deepEqual(stateRepository.getLastServices(), [4, 1, 3, 2]);
  });
});
