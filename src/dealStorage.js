// Persistence for saved deals.
//
// Backed by localStorage today, but every function returns a Promise so the
// backend can be swapped for an HTTP API or a database without touching a
// single component. Components must never call localStorage directly.
//
// A stored deal looks like:
//   {
//     id:             string    generated, stable for the life of the deal
//     name:           string    user-supplied, e.g. "412 Oak St"
//     calculatorType: string    "rental" | "brrrr" | "househack" | "flip"
//     inputs:         object    raw calculator inputs, verbatim
//     summary:        object    denormalized headline figures for list views
//     createdAt:      string    ISO 8601
//     updatedAt:      string    ISO 8601
//     schemaVersion:  number
//   }
//
// `summary` is whatever the caller hands over. Keeping it opaque is deliberate:
// this module stays ignorant of real-estate math, and list views avoid
// recomputing every deal just to render a table.

export const STORAGE_KEY = "dealAnalyzer.deals.v1";
export const SCHEMA_VERSION = 1;

function nowIso() {
  return new Date().toISOString();
}

function generateId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (e) {
    // fall through to the manual id below
  }
  return "deal_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

// Storage can be missing or throw outright (Safari private mode, disabled site
// data, a sandboxed iframe), so every access is guarded.
function getStore() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

export function isStorageAvailable() {
  const store = getStore();
  if (!store) return false;
  try {
    const probe = STORAGE_KEY + ".probe";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return true;
  } catch (e) {
    return false;
  }
}

function isValidDeal(d) {
  return (
    d &&
    typeof d === "object" &&
    typeof d.id === "string" &&
    d.id.length > 0 &&
    typeof d.inputs === "object" &&
    d.inputs !== null
  );
}

// Never throws. Corrupt or foreign data reads as an empty list rather than
// taking the app down on load.
function readAll() {
  const store = getStore();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidDeal);
  } catch (e) {
    return [];
  }
}

function writeAll(deals) {
  const store = getStore();
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(deals));
    return true;
  } catch (e) {
    // Most likely a quota error; surfaced to the caller as a rejected save.
    return false;
  }
}

function byNewestFirst(a, b) {
  return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
}

/**
 * List saved deals, newest first.
 * @param {{calculatorType?: string}} [options]
 * @returns {Promise<Array>}
 */
export async function listDeals(options) {
  const opts = options || {};
  let deals = readAll();
  if (opts.calculatorType) {
    deals = deals.filter(function (d) { return d.calculatorType === opts.calculatorType; });
  }
  return deals.slice().sort(byNewestFirst);
}

/**
 * Fetch one deal by id.
 * @returns {Promise<object|null>}
 */
export async function getDeal(id) {
  if (!id) return null;
  const found = readAll().find(function (d) { return d.id === id; });
  return found || null;
}

/**
 * Create or update a deal. Pass an existing `id` to update in place; omit it
 * to create a new one. Returns the stored record.
 * @param {{id?: string, name: string, calculatorType: string, inputs: object, summary?: object}} deal
 * @returns {Promise<object>}
 */
export async function saveDeal(deal) {
  if (!deal || typeof deal !== "object") throw new Error("A deal object is required");
  if (!deal.inputs || typeof deal.inputs !== "object") throw new Error("deal.inputs is required");

  const deals = readAll();
  const timestamp = nowIso();
  const existingIndex = deal.id ? deals.findIndex(function (d) { return d.id === deal.id; }) : -1;

  const record = {
    id: deal.id || generateId(),
    name: (deal.name || "").trim() || "Untitled deal",
    calculatorType: deal.calculatorType || "rental",
    // Copy so later edits to the live form don't mutate what was stored.
    inputs: Object.assign({}, deal.inputs),
    summary: Object.assign({}, deal.summary || {}),
    createdAt: existingIndex >= 0 ? deals[existingIndex].createdAt || timestamp : timestamp,
    updatedAt: timestamp,
    schemaVersion: SCHEMA_VERSION,
  };

  if (existingIndex >= 0) deals[existingIndex] = record;
  else deals.push(record);

  if (!writeAll(deals)) {
    throw new Error("Could not save — browser storage is full or unavailable");
  }
  return record;
}

/**
 * Delete a deal by id.
 * @returns {Promise<boolean>} true if a deal was removed
 */
export async function deleteDeal(id) {
  if (!id) return false;
  const deals = readAll();
  const remaining = deals.filter(function (d) { return d.id !== id; });
  if (remaining.length === deals.length) return false;
  if (!writeAll(remaining)) {
    throw new Error("Could not delete — browser storage is unavailable");
  }
  return true;
}

/**
 * Remove every saved deal.
 * @returns {Promise<void>}
 */
export async function clearDeals() {
  const store = getStore();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch (e) {
    // nothing useful to do if removal fails
  }
}
