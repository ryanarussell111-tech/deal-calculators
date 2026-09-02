import { useState } from "react";
import { calculateBrrrr } from "./brrrr";
import { fmtMoney, fmtPct, Field, Section, ResultBox, ExpenseRow, useCalcInputs } from "./calcUI";

const DEFAULTS = {
  purchasePrice: "120000",
  purchaseClosingCosts: "3",
  purchaseClosingCostsMode: "percent",
  rehabCosts: "30000",
  financing: "loan",
  downPayment: "20",
  downPaymentMode: "percent",
  purchaseLoanRate: "10",
  holdingMonths: "6",
  holdingCostsMonthly: "500",
  arv: "200000",
  refiLtv: "75",
  refiRate: "6.5",
  refiTermYears: "30",
  refiClosingCosts: "3",
  refiClosingCostsMode: "percent",
  monthlyRent: "1700",
  vacancyRate: "5",
  propertyTaxesAnnual: "2200",
  insuranceAnnual: "1400",
  managementRate: "8",
  maintenanceRate: "8",
  hoaMonthly: "0",
  utilitiesMonthly: "0",
  rentGrowthRate: "3",
};

function PhaseLabel({ n, text, color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ background: color + "22", border: "1px solid " + color + "55", color, borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{n}</span>
      {text}
    </span>
  );
}

export default function BrrrrCalculator() {
  const [inputs, set] = useCalcInputs(DEFAULTS);
  const [useGrowth, setUseGrowth] = useState(false);

  const r = calculateBrrrr(Object.assign({}, inputs, { rentGrowthRate: useGrowth ? inputs.rentGrowthRate : 0 }));
  const rental = r.rental;
  const cfColor = rental.monthlyCashFlow >= 0 ? "#00ff88" : "#f87171";
  const infiniteCoC = !Number.isFinite(r.cashOnCashReturn);
  const cocColor = infiniteCoC ? "#00ff88" : r.cashOnCashReturn >= 0.1 ? "#00ff88" : r.cashOnCashReturn >= 0 ? "#facc15" : "#f87171";
  const usingLoan = inputs.financing === "loan";
  const year5 = rental.projection[4];

  return (
    <div style={{ padding: "16px 0" }}>
      <Section title={<PhaseLabel n="1" text="🔨 Buy & Rehab" color="#818cf8" />} color="#818cf8">
        <Field label="Purchase Price $" value={inputs.purchasePrice} onChange={set("purchasePrice")} />
        <Field label="Closing Costs" value={inputs.purchaseClosingCosts} onChange={set("purchaseClosingCosts")} mode={inputs.purchaseClosingCostsMode} onModeChange={set("purchaseClosingCostsMode")} />
        <Field label="Rehab Budget $" value={inputs.rehabCosts} onChange={set("rehabCosts")} />
        <div style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 10, color: "#666", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Financing</div>
          <div style={{ display: "flex" }}>
            {[{ key: "loan", label: "Loan" }, { key: "cash", label: "All Cash" }].map(function (opt) {
              const active = inputs.financing === opt.key;
              return (
                <button key={opt.key} onClick={function () { set("financing")(opt.key); }} style={{ background: active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", border: "1px solid " + (active ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"), color: active ? "#818cf8" : "#555", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", borderRadius: opt.key === "loan" ? "8px 0 0 8px" : "0 8px 8px 0", flex: 1 }}>{opt.label}</button>
              );
            })}
          </div>
        </div>
        {usingLoan && <Field label="Down Payment" value={inputs.downPayment} onChange={set("downPayment")} mode={inputs.downPaymentMode} onModeChange={set("downPaymentMode")} />}
        {usingLoan && <Field label="Loan Rate % (int-only)" value={inputs.purchaseLoanRate} onChange={set("purchaseLoanRate")} />}
        <Field label="Holding Period (mo)" value={inputs.holdingMonths} onChange={set("holdingMonths")} />
        <Field label="Holding Costs $/mo" value={inputs.holdingCostsMonthly} onChange={set("holdingCostsMonthly")} />
      </Section>

      <Section title={<PhaseLabel n="2" text="🏦 Refinance" color="#0ea5e9" />} color="#0ea5e9">
        <Field label="After Repair Value $" value={inputs.arv} onChange={set("arv")} />
        <Field label="Refi LTV %" value={inputs.refiLtv} onChange={set("refiLtv")} />
        <Field label="Refi Rate %" value={inputs.refiRate} onChange={set("refiRate")} />
        <Field label="Refi Term (yrs)" value={inputs.refiTermYears} onChange={set("refiTermYears")} />
        <Field label="Refi Closing Costs" value={inputs.refiClosingCosts} onChange={set("refiClosingCosts")} mode={inputs.refiClosingCostsMode} onModeChange={set("refiClosingCostsMode")} />
      </Section>

      <Section title={<PhaseLabel n="3" text="💵 Rent (post-refi)" color="#00ff88" />} color="#00ff88">
        <Field label="Monthly Rent $" value={inputs.monthlyRent} onChange={set("monthlyRent")} />
        <Field label="Vacancy Rate %" value={inputs.vacancyRate} onChange={set("vacancyRate")} />
        <Field label="Property Taxes $/yr" value={inputs.propertyTaxesAnnual} onChange={set("propertyTaxesAnnual")} />
        <Field label="Insurance $/yr" value={inputs.insuranceAnnual} onChange={set("insuranceAnnual")} />
        <Field label="Mgmt % of Rent" value={inputs.managementRate} onChange={set("managementRate")} />
        <Field label="Maint + CapEx %" value={inputs.maintenanceRate} onChange={set("maintenanceRate")} />
        <Field label="HOA $/mo" value={inputs.hoaMonthly} onChange={set("hoaMonthly")} />
        <Field label="Utilities $/mo" value={inputs.utilitiesMonthly} onChange={set("utilitiesMonthly")} />
      </Section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultBox big label="Cash Left In Deal" value={fmtMoney(r.cashLeftInDeal)} color={r.cashLeftInDeal <= 0 ? "#00ff88" : "#818cf8"} />
        <ResultBox big label="Monthly Cash Flow (post-refi)" value={fmtMoney(rental.monthlyCashFlow, 2)} color={cfColor} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultBox label="Cash-on-Cash" value={infiniteCoC ? "∞" : fmtPct(r.cashOnCashReturn)} color={cocColor} />
        <ResultBox label="Cash Recovered" value={fmtPct(r.percentCashRecovered)} color={r.percentCashRecovered >= 1 ? "#00ff88" : r.percentCashRecovered >= 0.75 ? "#facc15" : "#f87171"} />
        <ResultBox label="Equity After Refi" value={fmtMoney(r.equityAfterRefi)} color="#0ea5e9" />
        <ResultBox label="Cap Rate (on ARV)" value={fmtPct(rental.capRate)} color={rental.capRate >= 0.06 ? "#00ff88" : "#facc15"} />
      </div>
      {infiniteCoC && r.totalCashInvested > 0 && (
        <div style={{ background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#00ff88", fontWeight: 700, marginBottom: 12 }}>
          ♾️ Full BRRRR: the refi returns all invested cash — the remaining cash flow is an infinite return.
        </div>
      )}
      {r.cashOut < 0 && (
        <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f87171", fontWeight: 700, marginBottom: 12 }}>
          ⚠️ Refi shortfall: the new loan doesn't cover the payoff + closing costs — you'd bring {fmtMoney(-r.cashOut)} to the refi table.
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, flex: "1 1 280px" }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Deal Waterfall</div>
          <ExpenseRow label="Purchase price" value={fmtMoney(r.purchasePrice)} />
          <ExpenseRow label="Purchase closing costs" value={fmtMoney(r.purchaseClosingCosts)} />
          <ExpenseRow label="Rehab" value={fmtMoney(r.rehabCosts)} />
          {usingLoan && <ExpenseRow label={"Bridge loan interest (" + inputs.holdingMonths + " mo)"} value={fmtMoney(r.holdingInterest)} />}
          <ExpenseRow label="Holding costs" value={fmtMoney(r.totalHoldingCosts - r.holdingInterest)} />
          <ExpenseRow label="Total project cost" value={fmtMoney(r.totalProjectCost)} />
          <ExpenseRow label="Cash invested pre-refi" value={fmtMoney(r.totalCashInvested)} />
          <div style={{ height: 8 }} />
          <ExpenseRow label={"Refi loan (" + inputs.refiLtv + "% of ARV)"} value={fmtMoney(r.refiLoanAmount)} />
          {usingLoan && <ExpenseRow label="Bridge loan payoff" value={fmtMoney(-r.initialLoanAmount)} />}
          <ExpenseRow label="Refi closing costs" value={fmtMoney(-r.refiClosingCosts)} />
          <ExpenseRow label={r.cashOut >= 0 ? "Cash out at refi" : "Cash due at refi"} value={fmtMoney(r.cashOut)} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px", fontSize: 13, fontWeight: 800 }}>
            <span style={{ color: "#999" }}>Cash left in deal</span>
            <span style={{ color: r.cashLeftInDeal <= 0 ? "#00ff88" : "#818cf8", fontFamily: "monospace" }}>{fmtMoney(r.cashLeftInDeal)}</span>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, flex: "1 1 280px" }}>
          <div style={{ fontSize: 11, color: "#00ff88", fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Post-Refi Monthly</div>
          <ExpenseRow label="Gross income (after vacancy)" value={fmtMoney(rental.grossMonthlyIncome, 2)} />
          <ExpenseRow label={"Refi mortgage (P&I, " + inputs.refiTermYears + "yr)"} value={fmtMoney(rental.mortgageMonthly, 2)} />
          <ExpenseRow label="Property taxes" value={fmtMoney(rental.taxesMonthly, 2)} />
          <ExpenseRow label="Insurance" value={fmtMoney(rental.insuranceMonthly, 2)} />
          <ExpenseRow label="Management" value={fmtMoney(rental.managementMonthly, 2)} />
          <ExpenseRow label="Maintenance + CapEx" value={fmtMoney(rental.maintenanceMonthly, 2)} />
          <ExpenseRow label="HOA + utilities" value={fmtMoney(rental.hoaMonthly + rental.utilitiesMonthly, 2)} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px", fontSize: 13, fontWeight: 800 }}>
            <span style={{ color: "#999" }}>Cash flow</span>
            <span style={{ color: cfColor, fontFamily: "monospace" }}>{fmtMoney(rental.monthlyCashFlow, 2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0 6px" }}>
            <span style={{ fontSize: 10, color: "#666", letterSpacing: 1, textTransform: "uppercase" }}>5-Year Projection</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={function () { setUseGrowth(function (g) { return !g; }); }} style={{ background: useGrowth ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.04)", border: "1px solid " + (useGrowth ? "rgba(14,165,233,0.5)" : "rgba(255,255,255,0.1)"), color: useGrowth ? "#0ea5e9" : "#555", borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {useGrowth ? "RENT GROWTH ON" : "FLAT RENT"}
              </button>
              {useGrowth && (
                <input type="number" value={inputs.rentGrowthRate} onChange={function (e) { set("rentGrowthRate")(e.target.value); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "4px 8px", color: "#ddd", fontSize: 11, outline: "none", fontFamily: "inherit", width: 52 }} title="Annual rent growth %" />
              )}
              {useGrowth && <span style={{ fontSize: 10, color: "#555" }}>%/yr</span>}
            </div>
          </div>
          <ExpenseRow label="Year 1 cash flow" value={fmtMoney(rental.projection[0].annualCashFlow)} />
          <ExpenseRow label="Year 5 cash flow" value={fmtMoney(year5.annualCashFlow)} />
          <ExpenseRow label="5-year cumulative" value={fmtMoney(year5.cumulativeCashFlow)} />
        </div>
      </div>
    </div>
  );
}
