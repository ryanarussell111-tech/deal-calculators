import { calculateRentalCashFlow } from "./rentalCashFlow";
import SaveDealBar from "./SaveDealBar";
import { fmtMoney, fmtPct, Field, Section, ResultBox, ExpenseRow, useCalcInputs } from "./calcUI";

export const RENTAL_DEFAULTS = {
  purchasePrice: "200000",
  downPayment: "20",
  downPaymentMode: "percent",
  interestRate: "6.5",
  loanTermYears: "30",
  points: "0",
  closingCosts: "3",
  closingCostsMode: "percent",
  rehabCosts: "0",
  monthlyRent: "1800",
  vacancyRate: "5",
  propertyTaxesAnnual: "2400",
  insuranceAnnual: "1400",
  managementRate: "8",
  maintenanceRate: "8",
  hoaMonthly: "0",
  utilitiesMonthly: "0",
  rentGrowthRate: "3",
  useGrowth: "no",
};

/**
 * @param {object} [props.loadedDeal]  a saved deal to open, or undefined for a blank form
 * @param {function} [props.onSaved]   called after a successful save
 */
export default function RentalCalculator({ loadedDeal }) {
  const [inputs, set] = useCalcInputs(
    loadedDeal ? Object.assign({}, RENTAL_DEFAULTS, loadedDeal.inputs) : RENTAL_DEFAULTS
  );
  const useGrowth = inputs.useGrowth === "yes";
  const setUseGrowth = function (next) { set("useGrowth")(next ? "yes" : "no"); };

  const r = calculateRentalCashFlow(Object.assign({}, inputs, { rentGrowthRate: useGrowth ? inputs.rentGrowthRate : 0 }));
  const cfColor = r.monthlyCashFlow >= 0 ? "#00ff88" : "#f87171";
  const year1 = r.projection[0];
  const year5 = r.projection[4];

  return (
    <div style={{ padding: "16px 0" }}>
      <Section title="🏠 Purchase & Loan" color="#818cf8">
        <Field label="Purchase Price $" value={inputs.purchasePrice} onChange={set("purchasePrice")} />
        <Field label="Down Payment" value={inputs.downPayment} onChange={set("downPayment")} mode={inputs.downPaymentMode} onModeChange={set("downPaymentMode")} />
        <Field label="Interest Rate %" value={inputs.interestRate} onChange={set("interestRate")} />
        <Field label="Loan Term (yrs)" value={inputs.loanTermYears} onChange={set("loanTermYears")} />
        <Field label="Points Charged %" value={inputs.points} onChange={set("points")} />
        <Field label="Closing Costs" value={inputs.closingCosts} onChange={set("closingCosts")} mode={inputs.closingCostsMode} onModeChange={set("closingCostsMode")} />
        <Field label="Rehab / Repairs $" value={inputs.rehabCosts} onChange={set("rehabCosts")} />
      </Section>

      <Section title="💵 Income" color="#00ff88">
        <Field label="Monthly Rent $" value={inputs.monthlyRent} onChange={set("monthlyRent")} />
        <Field label="Vacancy Rate %" value={inputs.vacancyRate} onChange={set("vacancyRate")} />
      </Section>

      <Section title="🧾 Expenses" color="#facc15">
        <Field label="Property Taxes $/yr" value={inputs.propertyTaxesAnnual} onChange={set("propertyTaxesAnnual")} />
        <Field label="Insurance $/yr" value={inputs.insuranceAnnual} onChange={set("insuranceAnnual")} />
        <Field label="Mgmt % of Rent" value={inputs.managementRate} onChange={set("managementRate")} />
        <Field label="Maint + CapEx %" value={inputs.maintenanceRate} onChange={set("maintenanceRate")} />
        <Field label="HOA $/mo" value={inputs.hoaMonthly} onChange={set("hoaMonthly")} />
        <Field label="Utilities $/mo" value={inputs.utilitiesMonthly} onChange={set("utilitiesMonthly")} />
      </Section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultBox big label="Monthly Cash Flow" value={fmtMoney(r.monthlyCashFlow, 2)} color={cfColor} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultBox label="Cap Rate" value={fmtPct(r.capRate)} color={r.capRate >= 0.06 ? "#00ff88" : "#facc15"} />
        <ResultBox label="Cash-on-Cash" value={fmtPct(r.cashOnCashReturn)} color={r.cashOnCashReturn >= 0.08 ? "#00ff88" : r.cashOnCashReturn >= 0 ? "#facc15" : "#f87171"} />
        <ResultBox label="Cash to Close" value={fmtMoney(r.totalCashInvested)} color="#818cf8" />
        <ResultBox label="Annual NOI" value={fmtMoney(r.noiAnnual)} color="#aaa" />
      </div>

      <SaveDealBar
        calculatorType="rental"
        inputs={inputs}
        loadedDeal={loadedDeal}
        summary={{
          monthlyCashFlow: r.monthlyCashFlow,
          capRate: r.capRate,
          cashOnCashReturn: r.cashOnCashReturn,
          totalCashInvested: r.totalCashInvested,
        }}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, flex: "1 1 280px" }}>
          <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Monthly Breakdown</div>
          <ExpenseRow label="Gross income (after vacancy)" value={fmtMoney(r.grossMonthlyIncome, 2)} />
          <ExpenseRow label="Mortgage (P&I)" value={fmtMoney(r.mortgageMonthly, 2)} />
          <ExpenseRow label="Property taxes" value={fmtMoney(r.taxesMonthly, 2)} />
          <ExpenseRow label="Insurance" value={fmtMoney(r.insuranceMonthly, 2)} />
          <ExpenseRow label="Management" value={fmtMoney(r.managementMonthly, 2)} />
          <ExpenseRow label="Maintenance + CapEx" value={fmtMoney(r.maintenanceMonthly, 2)} />
          <ExpenseRow label="HOA" value={fmtMoney(r.hoaMonthly, 2)} />
          <ExpenseRow label="Utilities" value={fmtMoney(r.utilitiesMonthly, 2)} />
          <ExpenseRow label="Total expenses" value={fmtMoney(r.totalMonthlyExpenses, 2)} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px", fontSize: 13, fontWeight: 800 }}>
            <span style={{ color: "#999" }}>Cash flow</span>
            <span style={{ color: cfColor, fontFamily: "monospace" }}>{fmtMoney(r.monthlyCashFlow, 2)}</span>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Cash to Close</div>
            <ExpenseRow label="Down payment" value={fmtMoney(r.downPayment, 2)} />
            <ExpenseRow label="Closing costs" value={fmtMoney(r.closingCosts, 2)} />
            <ExpenseRow label={"Points (" + (inputs.points || 0) + "% of loan)"} value={fmtMoney(r.pointsCost, 2)} />
            <ExpenseRow label="Rehab / repairs" value={fmtMoney(r.rehabCosts, 2)} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px", fontSize: 13, fontWeight: 800 }}>
              <span style={{ color: "#999" }}>Total cash invested</span>
              <span style={{ color: "#818cf8", fontFamily: "monospace" }}>{fmtMoney(r.totalCashInvested, 2)}</span>
            </div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 8 }}>
              Loan amount {fmtMoney(r.loanAmount)}. Points are paid upfront, so they raise cash to close without changing the monthly payment.
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, flex: "1 1 280px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, color: "#0ea5e9", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Projection</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={function () { setUseGrowth(!useGrowth); }} style={{ background: useGrowth ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.04)", border: "1px solid " + (useGrowth ? "rgba(14,165,233,0.5)" : "rgba(255,255,255,0.1)"), color: useGrowth ? "#0ea5e9" : "#555", borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {useGrowth ? "RENT GROWTH ON" : "FLAT RENT"}
              </button>
              {useGrowth && (
                <input type="number" value={inputs.rentGrowthRate} onChange={function (e) { set("rentGrowthRate")(e.target.value); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "4px 8px", color: "#ddd", fontSize: 11, outline: "none", fontFamily: "inherit", width: 52 }} title="Annual rent growth %" />
              )}
              {useGrowth && <span style={{ fontSize: 10, color: "#555" }}>%/yr</span>}
            </div>
          </div>
          <ExpenseRow label="Year 1 cash flow" value={fmtMoney(year1.annualCashFlow)} />
          <ExpenseRow label="Year 5 cash flow" value={fmtMoney(year5.annualCashFlow)} />
          <ExpenseRow label="5-year cumulative" value={fmtMoney(year5.cumulativeCashFlow)} />
          <div style={{ marginTop: 10 }}>
            {r.projection.map(function (row) {
              const max = Math.max.apply(null, r.projection.map(function (p) { return Math.abs(p.annualCashFlow); }).concat([1]));
              const w = Math.abs(row.annualCashFlow) / max * 100;
              return (
                <div key={row.year} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: "#666", width: 26, flexShrink: 0 }}>Y{row.year}</span>
                  <div style={{ flex: 1, height: 12, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ width: w + "%", height: "100%", background: row.annualCashFlow >= 0 ? "linear-gradient(90deg,#0ea5e9,#00ff88)" : "#f87171", borderRadius: 6 }} />
                  </div>
                  <span style={{ fontSize: 10, color: "#999", fontFamily: "monospace", width: 66, textAlign: "right", flexShrink: 0 }}>{fmtMoney(row.annualCashFlow)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
