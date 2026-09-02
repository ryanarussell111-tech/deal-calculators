import {
  STORAGE_KEY,
  SCHEMA_VERSION,
  listDeals,
  getDeal,
  saveDeal,
  deleteDeal,
  clearDeals,
  isStorageAvailable,
} from "./dealStorage";

const sampleInputs = { purchasePrice: "200000", monthlyRent: "1800", points: "1" };

beforeEach(async () => {
  window.localStorage.clear();
});

describe("dealStorage — basics", () => {
  test("storage is available in this environment", () => {
    expect(isStorageAvailable()).toBe(true);
  });

  test("starts empty", async () => {
    expect(await listDeals()).toEqual([]);
  });

  test("every function returns a promise so a real backend can drop in", () => {
    const calls = [listDeals(), getDeal("x"), deleteDeal("x"), clearDeals()];
    calls.forEach((c) => expect(typeof c.then).toBe("function"));
    return Promise.all(calls);
  });
});

describe("dealStorage — saving", () => {
  test("save creates a record with an id, timestamps, and a schema version", async () => {
    const saved = await saveDeal({
      name: "412 Oak St",
      calculatorType: "rental",
      inputs: sampleInputs,
      summary: { monthlyCashFlow: 94.02, capRate: 0.0663 },
    });
    expect(typeof saved.id).toBe("string");
    expect(saved.id.length).toBeGreaterThan(0);
    expect(saved.name).toBe("412 Oak St");
    expect(saved.calculatorType).toBe("rental");
    expect(saved.inputs).toEqual(sampleInputs);
    expect(saved.summary).toEqual({ monthlyCashFlow: 94.02, capRate: 0.0663 });
    expect(saved.schemaVersion).toBe(SCHEMA_VERSION);
    expect(Date.parse(saved.createdAt)).not.toBeNaN();
    expect(Date.parse(saved.updatedAt)).not.toBeNaN();
  });

  test("a saved deal can be read back by id and appears in the list", async () => {
    const saved = await saveDeal({ name: "A", calculatorType: "rental", inputs: sampleInputs });
    expect(await getDeal(saved.id)).toEqual(saved);
    expect(await listDeals()).toHaveLength(1);
  });

  test("saving twice without an id creates two distinct deals", async () => {
    const a = await saveDeal({ name: "A", calculatorType: "rental", inputs: sampleInputs });
    const b = await saveDeal({ name: "B", calculatorType: "rental", inputs: sampleInputs });
    expect(a.id).not.toBe(b.id);
    expect(await listDeals()).toHaveLength(2);
  });

  test("saving with an existing id updates in place and keeps createdAt", async () => {
    const first = await saveDeal({ name: "Old", calculatorType: "rental", inputs: sampleInputs });
    const updated = await saveDeal({
      id: first.id,
      name: "New",
      calculatorType: "rental",
      inputs: Object.assign({}, sampleInputs, { purchasePrice: "250000" }),
    });
    expect(updated.id).toBe(first.id);
    expect(updated.name).toBe("New");
    expect(updated.createdAt).toBe(first.createdAt);
    expect(updated.inputs.purchasePrice).toBe("250000");
    expect(await listDeals()).toHaveLength(1);
  });

  test("stored inputs are a copy, so later edits to the form don't leak in", async () => {
    const live = { purchasePrice: "100000" };
    const saved = await saveDeal({ name: "Copy", calculatorType: "rental", inputs: live });
    live.purchasePrice = "999999";
    const reloaded = await getDeal(saved.id);
    expect(reloaded.inputs.purchasePrice).toBe("100000");
  });

  test("a blank name falls back to a placeholder rather than saving empty", async () => {
    const saved = await saveDeal({ name: "   ", calculatorType: "rental", inputs: sampleInputs });
    expect(saved.name).toBe("Untitled deal");
  });

  test("saving without inputs is rejected", async () => {
    await expect(saveDeal({ name: "No inputs", calculatorType: "rental" })).rejects.toThrow(/inputs/);
  });
});

describe("dealStorage — listing", () => {
  test("deals come back newest-updated first", async () => {
    const a = await saveDeal({ name: "First", calculatorType: "rental", inputs: sampleInputs });
    const b = await saveDeal({ name: "Second", calculatorType: "rental", inputs: sampleInputs });
    // Force distinct, ordered timestamps regardless of clock resolution
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    raw.find((d) => d.id === a.id).updatedAt = "2026-01-01T00:00:00.000Z";
    raw.find((d) => d.id === b.id).updatedAt = "2026-06-01T00:00:00.000Z";
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const list = await listDeals();
    expect(list.map((d) => d.name)).toEqual(["Second", "First"]);
  });

  test("listing can be filtered by calculator type", async () => {
    await saveDeal({ name: "R", calculatorType: "rental", inputs: sampleInputs });
    await saveDeal({ name: "F", calculatorType: "flip", inputs: sampleInputs });
    expect(await listDeals({ calculatorType: "rental" })).toHaveLength(1);
    expect(await listDeals({ calculatorType: "flip" })).toHaveLength(1);
    expect(await listDeals()).toHaveLength(2);
  });
});

describe("dealStorage — deleting", () => {
  test("delete removes only the named deal", async () => {
    const a = await saveDeal({ name: "Keep", calculatorType: "rental", inputs: sampleInputs });
    const b = await saveDeal({ name: "Drop", calculatorType: "rental", inputs: sampleInputs });
    expect(await deleteDeal(b.id)).toBe(true);
    const list = await listDeals();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(a.id);
  });

  test("deleting an unknown id reports false rather than throwing", async () => {
    expect(await deleteDeal("nope")).toBe(false);
    expect(await deleteDeal()).toBe(false);
  });

  test("clearDeals empties everything", async () => {
    await saveDeal({ name: "A", calculatorType: "rental", inputs: sampleInputs });
    await saveDeal({ name: "B", calculatorType: "rental", inputs: sampleInputs });
    await clearDeals();
    expect(await listDeals()).toEqual([]);
  });
});

describe("dealStorage — hostile storage", () => {
  test("unparseable storage reads as empty instead of throwing", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json at all");
    expect(await listDeals()).toEqual([]);
    expect(await getDeal("anything")).toBeNull();
  });

  test("a non-array payload reads as empty", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ rogue: true }));
    expect(await listDeals()).toEqual([]);
  });

  test("malformed entries are filtered out, valid ones survive", async () => {
    const good = {
      id: "good1", name: "Good", calculatorType: "rental",
      inputs: { a: 1 }, summary: {}, createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z", schemaVersion: 1,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([good, null, 42, { id: "x" }, { inputs: {} }]));
    const list = await listDeals();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("good1");
  });

  test("a save that cannot be written surfaces as a rejection", async () => {
    // jsdom's localStorage is a Proxy, so assigning setItem on the instance
    // would just store a key called "setItem". Spy on the prototype instead.
    const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    try {
      await expect(
        saveDeal({ name: "Too big", calculatorType: "rental", inputs: sampleInputs })
      ).rejects.toThrow(/storage/i);
    } finally {
      spy.mockRestore();
    }
  });

  test("a delete that cannot be written surfaces as a rejection", async () => {
    const saved = await saveDeal({ name: "A", calculatorType: "rental", inputs: sampleInputs });
    const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    try {
      await expect(deleteDeal(saved.id)).rejects.toThrow(/storage/i);
    } finally {
      spy.mockRestore();
    }
  });

  test("storage reported unavailable when writes throw", async () => {
    const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    try {
      expect(isStorageAvailable()).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  test("writing over a corrupt store still works", async () => {
    window.localStorage.setItem(STORAGE_KEY, "garbage");
    const saved = await saveDeal({ name: "Recovered", calculatorType: "rental", inputs: sampleInputs });
    const list = await listDeals();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(saved.id);
  });
});
