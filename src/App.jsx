import { useState } from "react";
import RentalCalculator from "./RentalCalculator";
import BrrrrCalculator from "./BrrrrCalculator";
import HouseHackCalculator from "./HouseHackCalculator";
import FixAndFlipCalculator from "./FixAndFlipCalculator";
import SavedDeals from "./SavedDeals";
import { CALCULATOR_TYPES } from "./calculatorTypes";

const TABS = [
  { key: "rental", label: "🏠 Rental Cash Flow", blurb: "Buy-and-hold cash flow, cap rate, and cash-on-cash return." },
  { key: "brrrr", label: "🔄 BRRRR", blurb: "Buy, rehab, rent, refinance — how much cash comes back out." },
  { key: "househack", label: "🚪 House Hacking", blurb: "Live in one unit, rent the rest — what it actually costs you to live there." },
  { key: "flip", label: "🔨 Fix & Flip", blurb: "Buy, renovate, resell — profit, ROI, and the 70% rule check." },
  { key: "saved", label: "💾 Saved Deals", blurb: "Deals you've saved in this browser. Open one to load its numbers back in." },
];

export default function App() {
  const [view, setView] = useState("rental");
  // A load request carries the deal plus a nonce, so re-opening the same deal
  // still remounts the calculator and resets any unsaved edits.
  const [loadRequest, setLoadRequest] = useState(null);
  const active = TABS.find(function (t) { return t.key === view; });

  function handleOpenDeal(deal) {
    const type = deal.calculatorType;
    // Type keys double as tab keys, so an unknown type means a record this
    // build can't render — ignore rather than switching to a blank tab.
    if (!CALCULATOR_TYPES[type]) return;
    setLoadRequest({ deal, nonce: Date.now() });
    setView(type);
  }

  // Only hand a loaded deal to the calculator it belongs to, and key on a
  // nonce so re-opening the same deal remounts and drops unsaved edits.
  function dealFor(type) {
    return loadRequest && loadRequest.deal.calculatorType === type ? loadRequest.deal : undefined;
  }
  function keyFor(type) {
    const d = dealFor(type);
    return d ? type + "-" + d.id + "-" + loadRequest.nonce : type + "-new";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a10", color: "#ddd", fontFamily: "system-ui, sans-serif", paddingBottom: 40 }}>
      <style>{"::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}*{box-sizing:border-box;margin:0;padding:0}"}</style>

      <div style={{ background: "linear-gradient(180deg,rgba(16,185,129,0.12) 0%,transparent 100%)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>Deal Analyzer</div>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>Real Estate Investment Calculators</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {TABS.map(function (tab) {
            const isActive = view === tab.key;
            return (
              <button key={tab.key} onClick={function () { setView(tab.key); }} style={{ background: isActive ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.03)", border: "1px solid " + (isActive ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.08)"), color: isActive ? "#10b981" : "#666", borderRadius: 10, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{tab.label}</button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 10 }}>{active.blurb}</div>
      </div>

      <div style={{ padding: "0 16px", maxWidth: 1400, margin: "0 auto" }}>
        {view === "rental" && <RentalCalculator key={keyFor("rental")} loadedDeal={dealFor("rental")} />}
        {view === "brrrr" && <BrrrrCalculator key={keyFor("brrrr")} loadedDeal={dealFor("brrrr")} />}
        {view === "househack" && <HouseHackCalculator key={keyFor("househack")} loadedDeal={dealFor("househack")} />}
        {view === "flip" && <FixAndFlipCalculator key={keyFor("flip")} loadedDeal={dealFor("flip")} />}
        {view === "saved" && <SavedDeals onOpen={handleOpenDeal} />}
      </div>
    </div>
  );
}
