import { useState, useEffect, useCallback } from "react";
import { listDeals, deleteDeal } from "./dealStorage";
import { fmtMoney, fmtPct, Button } from "./calcUI";

const TYPE_LABELS = {
  rental: "Rental Cash Flow",
  brrrr: "BRRRR",
  househack: "House Hacking",
  flip: "Fix & Flip",
};

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function SavedDeals({ onOpen }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [error, setError] = useState(null);

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

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#555", fontSize: 13 }}>Loading saved deals…</div>;
  }

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
            Run the numbers on a property, name it, and hit Save Deal. It'll show up here.
          </div>
          <div style={{ fontSize: 10, color: "#444", marginTop: 12 }}>
            Deals are stored in this browser only — they won't follow you to another device.
          </div>
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#00ff88", fontWeight: 700, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
            Saved Deals ({deals.length})
          </div>

          <div style={{ display: "flex", fontSize: 10, color: "#555", letterSpacing: 1, textTransform: "uppercase", paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)", gap: 10 }}>
            <span style={{ flex: 2, minWidth: 120 }}>Deal</span>
            <span style={{ width: 110, textAlign: "right" }}>Cash Flow /mo</span>
            <span style={{ width: 80, textAlign: "right" }}>Cap Rate</span>
            <span style={{ width: 170, textAlign: "right" }}>Saved</span>
            <span style={{ width: 150 }} />
          </div>

          {deals.map(function (deal) {
            const s = deal.summary || {};
            const cf = typeof s.monthlyCashFlow === "number" ? s.monthlyCashFlow : null;
            const cap = typeof s.capRate === "number" ? s.capRate : null;
            const confirming = confirmingId === deal.id;
            return (
              <div key={deal.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" }}>
                <span style={{ flex: 2, minWidth: 120 }}>
                  <span style={{ display: "block", color: "#ddd", fontSize: 13, fontWeight: 700 }}>{deal.name}</span>
                  <span style={{ display: "block", color: "#555", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 }}>
                    {TYPE_LABELS[deal.calculatorType] || deal.calculatorType}
                  </span>
                </span>
                <span style={{ width: 110, textAlign: "right", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: cf === null ? "#555" : cf >= 0 ? "#00ff88" : "#f87171" }}>
                  {cf === null ? "—" : fmtMoney(cf, 2)}
                </span>
                <span style={{ width: 80, textAlign: "right", fontFamily: "monospace", fontSize: 13, color: "#ccc" }}>
                  {cap === null ? "—" : fmtPct(cap)}
                </span>
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
