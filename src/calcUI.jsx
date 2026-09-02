// Shared form/output building blocks for the deal calculators.
import { useState } from "react";

export function fmtMoney(n, decimals) {
  const d = decimals === undefined ? 0 : decimals;
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtPct(n) {
  return (n * 100).toFixed(2) + "%";
}

export function Field({ label, value, onChange, suffix, mode, onModeChange }) {
  return (
    <div style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 10, color: "#666", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", gap: 4 }}>
        <input
          type="number"
          value={value}
          onChange={function (e) { onChange(e.target.value); }}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", color: "#ddd", fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%", minWidth: 0 }}
        />
        {mode !== undefined && (
          <div style={{ display: "flex", flexShrink: 0 }}>
            {["percent", "dollar"].map(function (m) {
              const active = mode === m;
              return (
                <button key={m} onClick={function () { onModeChange(m); }} style={{ background: active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", border: "1px solid " + (active ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"), color: active ? "#818cf8" : "#555", padding: "0 9px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", borderRadius: m === "percent" ? "8px 0 0 8px" : "0 8px 8px 0" }}>
                  {m === "percent" ? "%" : "$"}
                </button>
              );
            })}
          </div>
        )}
        {suffix && mode === undefined && <span style={{ color: "#555", fontSize: 12, alignSelf: "center", flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

export function Section({ title, color, children }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: color, fontWeight: 700, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>{title}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

export function ResultBox({ label, value, color, big }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: big ? "16px 20px" : "12px 16px", flex: big ? "1 1 100%" : "1 1 130px" }}>
      <div style={{ fontSize: 10, color: "#666", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: big ? 34 : 20, fontWeight: 900, color: color, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

export function ExpenseRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ color: "#777" }}>{label}</span>
      <span style={{ color: "#ccc", fontFamily: "monospace", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// Small hook so each calculator keeps its inputs as strings with a setter-per-key.
export function useCalcInputs(defaults) {
  const [inputs, setInputs] = useState(defaults);
  function set(key) {
    return function (val) {
      setInputs(function (prev) { return Object.assign({}, prev, { [key]: val }); });
    };
  }
  return [inputs, set];
}
