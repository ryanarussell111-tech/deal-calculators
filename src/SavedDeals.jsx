import { useState, useEffect, useCallback } from "react";
import { listDeals, deleteDeal } from "./dealStorage";
import { CALCULATOR_TYPES, CALCULATOR_TYPE_KEYS, typeInfo } from "./calculatorTypes";
import { fmtMoney, fmtPct, Button } from "./calcUI";

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "name", label: "Name" },
];

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Rows are heterogeneous — a flip has no cap rate, a house hack has no cash
// flow — so each cell carries its own label rather than relying on a shared
// column header.
function MetricCell({ metric, summary }) {
  const raw = metric ? summary[metric.key] : undefined;
  const has = typeof raw === "number" && isFinite(raw);
  let text = "—";
  if (has) text = metric.format === "percent" ? fmtPct(raw) : fmtMoney(raw, metric.format === "money" ? 2 : 0);
  const color = !has ? "#555" : metric.signed ? (raw >= 0 ? "#00ff88" : "#f87171") : "#ccc";
  return (
    <span style={{ width: 130, textAlign: "right" }}>
      <span style={{ display: "block", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color }}>{text}</span>
      <span style={{ display: "block", fontSize: 9, color: "#555", marginTop: 2 }}>{metric ? metric.label : ""}</span>
    </span>
  );
}

export default function SavedDeals({ onOpen }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const refresh = useCallback(async function () {
    try {
      setDeals(await listDeals());
      setError(null);
    } catch (e) {
      setError(e.message || "Could not read saved deals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(function () { refresh(); }, [refresh]);

  async function handleDelete(id) {
    try {
      await deleteDeal(id);
      setConfirmingId(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not delete that deal");
    }
  }

  const counts = deals.reduce(function (acc, d) {
    acc[d.calculatorType] = (acc[d.calculatorType] || 0) + 1;
    return acc;
  }, {});

  const visible = deals
    .filter(function (d) { return filter === "all" || d.calculatorType === filter; })
    .slice()
    .sort(function (a, b) {
      if (sort === "name") return String(a.name).localeCompare(String(b.name));
      const cmp = String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      return sort === "oldest" ? -cmp : cmp;
    });

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#555", fontSize: 13 }}>Loading saved deals…</div>;
  }

  const chip = function (active, accent) {
    return {
      background: active ? accent + "22" : "rgba(255,255,255,0.03)",
      border: "1px solid " + (active ? accent + "66" : "rgba(255,255,255,0.08)"),
      color: active ? accent : "#666",
      borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700,
      cursor: "pointer", fontFamily: "inherit",
    };
  };

  return (
    <div style={{ padding: "16px 0" }}>
      {error && (
        <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f87171", fontWeight: 700, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {deals.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "#999", fontWeight: 700, marginBottom: 6 }}>No saved deals yet</div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Run the numbers on any calculator, name it, and hit Save Deal. It'll show up here.
          </div>
          <div style={{ fontSize: 10, color: "#444", marginTop: 12 }}>
            Deals are stored in this browser only — they won't follow you to another device.
          </div>
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#00ff88", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Saved Deals ({visible.length}{filter === "all" ? "" : " of " + deals.length})
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Sort</span>
              {SORTS.map(function (s) {
                return (
                  <button key={s.key} onClick={function () { setSort(s.key); }} style={chip(sort === s.key, "#818cf8")}>{s.label}</button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={function () { setFilter("all"); }} style={chip(filter === "all", "#00ff88")}>
              All ({deals.length})
            </button>
            {CALCULATOR_TYPE_KEYS.map(function (key) {
              const info = CALCULATOR_TYPES[key];
              const n = counts[key] || 0;
              return (
                <button key={key} onClick={function () { setFilter(key); }} style={chip(filter === key, info.color)} disabled={n === 0}>
                  {info.icon} {info.label} ({n})
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", fontSize: 10, color: "#555", letterSpacing: 1, textTransform: "uppercase", paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)", gap: 10 }}>
            <span style={{ flex: 2, minWidth: 140 }}>Deal</span>
            <span style={{ width: 130, textAlign: "right" }}>Key Figure</span>
            <span style={{ width: 130, textAlign: "right" }}>Return</span>
            <span style={{ width: 170, textAlign: "right" }}>Saved</span>
            <span style={{ width: 150 }} />
          </div>

          {visible.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "#555", fontSize: 12 }}>
              No {typeInfo(filter).label} deals saved yet.
            </div>
          ) : visible.map(function (deal) {
            const info = typeInfo(deal.calculatorType);
            const summary = deal.summary || {};
            const confirming = confirmingId === deal.id;
            return (
              <div key={deal.id} data-testid={"deal-row-" + deal.calculatorType} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" }}>
                <span style={{ flex: 2, minWidth: 140, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true">{info.icon}</span>
                  <span>
                    <span style={{ display: "block", color: "#ddd", fontSize: 13, fontWeight: 700 }}>{deal.name}</span>
                    <span style={{ display: "block", color: info.color, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2, opacity: 0.75 }}>
                      {info.label}
                    </span>
                  </span>
                </span>
                <MetricCell metric={info.metrics[0]} summary={summary} />
                <MetricCell metric={info.metrics[1]} summary={summary} />
                <span style={{ width: 170, textAlign: "right", fontSize: 11, color: "#666", whiteSpace: "nowrap" }}>
                  {formatDate(deal.updatedAt)}
                </span>
                <span style={{ width: 150, display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <Button color="#0ea5e9" onClick={function () { if (onOpen) onOpen(deal); }}>Open</Button>
                  {confirming ? (
                    <Button color="#f87171" onClick={function () { handleDelete(deal.id); }}>Confirm?</Button>
                  ) : (
                    <Button color="#777" onClick={function () { setConfirmingId(deal.id); }}>Delete</Button>
                  )}
                </span>
              </div>
            );
          })}

          <div style={{ fontSize: 10, color: "#444", marginTop: 12 }}>
            Stored in this browser only. Clearing site data removes them.
          </div>
        </div>
      )}
    </div>
  );
}
