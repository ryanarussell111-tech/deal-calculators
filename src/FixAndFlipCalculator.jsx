import { calculateFixAndFlip } from "./fixAndFlip";
import { fmtMoney, fmtPct, Field, Section, Segmented, ResultBox, ExpenseRow, useCalcInputs } from "./calcUI";

const DEFAULTS = {
  purchasePrice: "150000",
  purchaseClosingCosts: "2",
  purchaseClosingCostsMode: "percent",
  rehabBudget: "45000",
  holdingMonths: "6",
  downPayment: "20",
  downPaymentMode: "percent",
  interestRate: "12",
  loanType: "hardMoney",
  points: "2",
  interestOnly: "yes",
  loanTermYears: "30",
  monthlyTaxes: "200",
  monthlyInsurance: "100",
  monthlyUtilities: "150",
  arv: "260000",
  commissionRate: "6",
  saleClosingCosts: "1",
  saleClosingCostsMode: "percent",
};

export default function FixAndFlipCalculator() {
  const [inputs, set] = useCalcInputs(DEFAULTS);

  const r = calculateFixAndFlip(Object.assign({}, inputs, {
    interestOnly: inputs.interestOnly === "yes",
  }));

  const isHardMoney = inputs.loanType === "hardMoney";
  const profitable = r.netProfit >= 0;
  const profitColor = profitable ? "#00ff88" : "#f87171";
  const roiColor = r.roi >= 0.2 ? "#00ff88" : r.roi >= 0 ? "#facc15" : "#f87171";
  const ruleColor = r.passesSeventyRule ? "#00ff88" : "#f87171";

  return (
    <div style={{ padding: "16px 0" }}>
      <Section title="🔨 Purchase & Rehab" color="#818cf8">
        <Field label="Purchase Price $" value={inputs.purchasePrice} onChange={set("purchasePrice")} />
        <Field label="Closing Costs" value={inputs.purchaseClosingCosts} onChange={set("purchaseClosingCosts")} mode={inputs.purchaseClosingCostsMode} onModeChange={set("purchaseClosingCostsMode")} />
        <Field label="Rehab Budget $" value={inputs.rehabBudget} onChange={set("rehabBudget")} />
        <Field label="Holding Period (mo)" value={inputs.holdingMonths} onChange={set("holdingMonths")} />
      </Section>

      <Section title="🏦 Financing" color="#a78bfa">
        <Segmented
          label="Loan Type"
          color="#a78bfa"
          options={[{ value: "hardMoney", label: "Hard Money" }, { value: "conventional", label: "Conventional" }]}
          value={inputs.loanType}
          onChange={set("loanType")}
        />
        <Field label="Down Payment" value={inputs.downPayment} onChange={set("downPayment")} mode={inputs.downPaymentMode} onModeChange={set("downPaymentMode")} />
        <Field label="Interest Rate %" value={inputs.interestRate} onChange={set("interestRate")} />
        {isHardMoney && <Field label="Points % of Loan" value={inputs.points} onChange={set("points")} />}
        <Segmented
          label="Payments"
          color="#a78bfa"
          options={[{ value: "yes", label: "Interest-Only" }, { value: "no", label: "Amortizing" }]}
          value={inputs.interestOnly}
          onChange={set("interestOnly")}
        />
        {inputs.interestOnly === "no" && <Field label="Loan Term (yrs)" value={inputs.loanTermYears} onChange={set("loanTermYears")} />}
      </Section>

      <Section title="🧾 Monthly Holding Costs" color="#facc15">
        <Field label="Property Taxes $/mo" value={inputs.monthlyTaxes} onChange={set("monthlyTaxes")} />
        <Field label="Insurance $/mo" value={inputs.monthlyInsurance} onChange={set("monthlyInsurance")} />
        <Field label="Utilities $/mo" value={inputs.monthlyUtilities} onChange={set("monthlyUtilities")} />
      </Section>

      <Section title="💰 Sale" color="#00ff88">
        <Field label="After Repair Value $" value={inputs.arv} onChange={set("arv")} />
        <Field label="Agent Commission %" value={inputs.commissionRate} onChange={set("commissionRate")} />
        <Field label="Sale Closing Costs" value={inputs.saleClosingCosts} onChange={set("saleClosingCosts")} mode={inputs.saleClosingCostsMode} onModeChange={set("saleClosingCostsMode")} />
      </Section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultBox big label="Net Profit" value={fmtMoney(r.netProfit, 2)} color={profitColor} />
        <ResultBox big label="Return on Invested Cash" value={fmtPct(r.roi)} color={roiColor} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultBox label="Total Cash Invested" value={fmtMoney(r.totalCashInvested)} color="#818cf8" />
        <ResultBox label="Total Project Cost" value={fmtMoney(r.totalProjectCost)} color="#aaa" />
        <ResultBox label="Breakeven Sale Price" value={fmtMoney(r.breakevenSalePrice)} color="#facc15" />
        <ResultBox label="Profit Margin on ARV" value={fmtPct(r.profitMargin)} color={profitable ? "#00ff88" : "#f87171"} />
      </div>

      <div style={{ background: r.passesSeventyRule ? "rgba(0,255,136,0.07)" : "rgba(248,113,113,0.07)", border: "1px solid " + (r.passesSeventyRule ? "rgba(0,255,136,0.25)" : "rgba(248,113,113,0.25)"), borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ background: ruleColor + "22", border: "1.5px solid " + ruleColor, color: ruleColor, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>
          {r.passesSeventyRule ? "70% RULE — PASS" : "70% RULE — FAIL"}
        </span>
        <span style={{ fontSize: 12, color: "#999" }}>
          Max offer is <strong style={{ color: "#ccc", fontFamily: "monospace" }}>{fmtMoney(r.maxOfferSeventyRule)}</strong>
          {" "}(70% of ARV less rehab).{" "}
          {r.passesSeventyRule
            ? <span style={{ color: "#00ff88" }}>You have {fmtMoney(-r.seventyRuleDelta)} of headroom.</span>
            : <span style={{ color: "#f87171" }}>You're {fmtMoney(r.seventyRuleDelta)} over it.</span>}
        </span>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, flex: "1 1 300px" }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Where the Money Goes</div>
          <ExpenseRow label="Purchase price" value={fmtMoney(r.purchasePrice)} />
          <ExpenseRow label="Purchase closing costs" value={fmtMoney(r.purchaseClosingCosts)} />
          <ExpenseRow label="Rehab budget" value={fmtMoney(r.rehabBudget)} />
          {isHardMoney && <ExpenseRow label={"Points (" + (inputs.points || 0) + "% of loan)"} value={fmtMoney(r.pointsCost)} />}
          <ExpenseRow label={"Holding costs (" + (inputs.holdingMonths || 0) + " mo)"} value={fmtMoney(r.totalHoldingCosts)} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, fontWeight: 800, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ color: "#999" }}>Total project cost</span>
            <span style={{ color: "#ccc", fontFamily: "monospace" }}>{fmtMoney(r.totalProjectCost)}</span>
          </div>
          <div style={{ height: 8 }} />
          <ExpenseRow label="Sale price (ARV)" value={fmtMoney(r.arv)} />
          <ExpenseRow label={"Agent commission (" + (inputs.commissionRate || 0) + "%)"} value={"-" + fmtMoney(r.commissionCost)} />
          <ExpenseRow label="Sale closing costs" value={"-" + fmtMoney(r.saleClosingCost)} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px", fontSize: 13, fontWeight: 800 }}>
            <span style={{ color: "#999" }}>Net profit</span>
            <span style={{ color: profitColor, fontFamily: "monospace" }}>{fmtMoney(r.netProfit, 2)}</span>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, flex: "1 1 300px" }}>
          <div style={{ fontSize: 11, color: "#facc15", fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Monthly Carry</div>
          <ExpenseRow label={"Loan payment (" + (r.interestOnly ? "interest-only" : "amortizing") + ")"} value={fmtMoney(r.monthlyLoanPayment, 2)} />
          <ExpenseRow label="Property taxes" value={fmtMoney(r.monthlyTaxes, 2)} />
          <ExpenseRow label="Insurance" value={fmtMoney(r.monthlyInsurance, 2)} />
          <ExpenseRow label="Utilities" value={fmtMoney(r.monthlyUtilities, 2)} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px", fontSize: 13, fontWeight: 800 }}>
            <span style={{ color: "#999" }}>Per month</span>
            <span style={{ color: "#facc15", fontFamily: "monospace" }}>{fmtMoney(r.monthlyHoldingCosts, 2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 2px", fontSize: 12 }}>
            <span style={{ color: "#777" }}>Over {inputs.holdingMonths || 0} months</span>
            <span style={{ color: "#ccc", fontFamily: "monospace", fontWeight: 700 }}>{fmtMoney(r.totalHoldingCosts)}</span>
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Cash Out of Pocket</div>
            <ExpenseRow label="At closing" value={fmtMoney(r.totalCashInvested)} />
            <ExpenseRow label="Plus carry over the hold" value={fmtMoney(r.totalCashInvestedWithHolding)} />
            <div style={{ fontSize: 10, color: "#555", marginTop: 8 }}>
              ROI above is measured against cash at closing.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
