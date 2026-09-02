// Single source of truth for calculator type identifiers.
//
// The key is what goes into a saved deal's `calculatorType` field AND what the
// App uses as its tab key, so opening a saved deal can route by type directly.
// Changing a key would orphan already-saved deals, so treat these as stable.
//
// `metrics` names the one or two figures the saved-deals list shows for that
// type. Storage stays semantic (each calculator saves meaningfully named
// numbers); this table decides what to surface, keeping display concerns out
// of dealStorage.

export const CALCULATOR_TYPES = {
  rental: {
    label: "Rental Cash Flow",
    icon: "🏠",
    color: "#00ff88",
    metrics: [
      { key: "monthlyCashFlow", label: "Cash flow /mo", format: "money", signed: true },
      { key: "capRate", label: "Cap rate", format: "percent" },
    ],
  },
  brrrr: {
    label: "BRRRR",
    icon: "🔄",
    color: "#0ea5e9",
    metrics: [
      { key: "monthlyCashFlow", label: "Cash flow /mo", format: "money", signed: true },
      { key: "cashLeftInDeal", label: "Left in deal", format: "money" },
    ],
  },
  househack: {
    label: "House Hacking",
    icon: "🚪",
    color: "#a78bfa",
    metrics: [
      { key: "effectiveHousingCost", label: "Housing cost /mo", format: "money" },
      { key: "monthlySavings", label: "Saved /mo", format: "money", signed: true },
    ],
  },
  flip: {
    label: "Fix & Flip",
    icon: "🔨",
    color: "#facc15",
    metrics: [
      { key: "netProfit", label: "Net profit", format: "money", signed: true },
      { key: "roi", label: "ROI", format: "percent", signed: true },
    ],
  },
};

export const CALCULATOR_TYPE_KEYS = Object.keys(CALCULATOR_TYPES);

export function typeInfo(key) {
  return CALCULATOR_TYPES[key] || { label: key || "Unknown", icon: "📄", color: "#888", metrics: [] };
}
