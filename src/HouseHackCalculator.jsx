import { calculateHouseHack } from "./houseHack";
import { fmtMoney, fmtPct, Field, Section, Segmented, ResultBox, ExpenseRow, useCalcInputs } from "./calcUI";

const DEFAULTS = {
  purchasePrice: "300000",
  downPayment: "5",
  downPaymentMode: "percent",
  interestRate: "6.5",
  loanTermYears: "30",
  closingCosts: "3",
  closingCostsMode: "percent",
  numberOfUnits: "2",
  ownerUnitIndex: "0",
  unitRent0: "1500",
  unitRent1: "1600",
  unitRent2: "1400",
  unitRent3: "1400",
  vacancyRate: "5",
  propertyTaxesAnnual: "3600",
  insuranceAnnual: "1800",
  hoaMonthly: "0",
  utilitiesMonthly: "150",
  managementRate: "0",
  maintenanceRate: "8",
};

export default function HouseHackCalculator() {
  const [inputs, set] = useCalcInputs(DEFAULTS);

  const unitCount = Math.max(2, Math.min(4, Number(inputs.numberOfUnits) || 2));
  const unitRents = [];
  for (let i = 0; i < unitCount; i++) unitRents.push(inputs["unitRent" + i]);

  const r = calculateHouseHack(Object.assign({}, inputs, {
    numberOfUnits: unitCount,
    unitRents,
  }));

  const coveredByTenants = r.effectiveHousingCost <= 0;
  const costColor = coveredByTenants ? "#00ff88" : "#818cf8";
  const savingsColor = r.monthlySavings >= 0 ? "#00ff88" : "#f87171";

  const unitOptions = [];
  for (let i = 0; i < unitCount; i++) unitOptions.push({ value: i, label: "Unit " + (i + 1) });

  return (
    <div style={{ padding: "16px 0" }}>
      <Section title="🏠 Purchase & Loan" color="#818cf8">
        <Field label="Purchase Price $" value={inputs.purchasePrice} onChange={set("purchasePrice")} />
        <Field label="Down Payment" value={inputs.downPayment} onChange={set("downPayment")} mode={inputs.downPaymentMode} onModeChange={set("downPaymentMode")} />
        <Field label="Interest Rate %" value={inputs.interestRate} onChange={set("interestRate")} />
        <Field label="Loan Term (yrs)" value={inputs.loanTermYears} onChange={set("loanTermYears")} />
        <Field label="Closing Costs" value={inputs.closingCosts} onChange={set("closingCosts")} mode={inputs.closingCostsMode} onModeChange={set("closingCostsMode")} />
      </Section>

      <Section title="🚪 Units & Rents" color="#0ea5e9">
        <Segmented
          label="Number of Units"
          options={[{ value: 2, label: "2" }, { value: 3, label: "3" }, { value: 4, label: "4" }]}
          value={unitCount}
          onChange={function (v) {
            set("numberOfUnits")(v);
            // Keep the owner in a unit that still exists.
            if (Number(inputs.ownerUnitIndex) > Number(v) - 1) set("ownerUnitIndex")("0");
          }}
        />
        <Segmented label="You Live In" options={unitOptions} value={inputs.ownerUnitIndex} onChange={set("ownerUnitIndex")} />
        <Field label="Vacancy Rate %" value={inputs.vacancyRate} onChange={set("vacancyRate")} />
        {unitRents.map(function (rent, i) {
          const isOwner = Number(inputs.ownerUnitIndex) === i;
          return (
            <Field
              key={i}
              label={"Unit " + (i + 1) + " Rent $" + (isOwner ? " (yours, market)" : "")}
              value={inputs["unitRent" + i]}
              onChange={set("unitRent" + i)}
            />
          );
        })}
      </Section>

      <Section title="🧾 Expenses" color="#facc15">
        <Field label="Property Taxes $/yr" value={inputs.propertyTaxesAnnual} onChange={set("propertyTaxesAnnual")} />
        <Field label="Insurance $/yr" value={inputs.insuranceAnnual} onChange={set("insuranceAnnual")} />
        <Field label="Maint + CapEx %" value={inputs.maintenanceRate} onChange={set("maintenanceRate")} />
        <Field label="Mgmt % (0 = self)" value={inputs.managementRate} onChange={set("managementRate")} />
        <Field label="HOA $/mo" value={inputs.hoaMonthly} onChange={set("hoaMonthly")} />
        <Field label="Utilities $/mo" value={inputs.utilitiesMonthly} onChange={set("utilitiesMonthly")} />
      </Section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultBox big label="Your Effective Monthly Housing Cost" value={fmtMoney(r.effectiveHousingCost, 2)} color={costColor} />
        <ResultBox big label="Monthly Savings vs Renting" value={fmtMoney(r.monthlySavings, 2)} color={savingsColor} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultBox label="Cap Rate" value={fmtPct(r.capRate)} color={r.capRate >= 0.06 ? "#00ff88" : "#facc15"} />
        <ResultBox label="Cash-on-Cash" value={fmtPct(r.cashOnCashReturn)} color={r.cashOnCashReturn >= 0.08 ? "#00ff88" : r.cashOnCashReturn >= 0 ? "#facc15" : "#f87171"} />
        <ResultBox label="Cash to Close" value={fmtMoney(r.totalCashInvested)} color="#818cf8" />
        <ResultBox label="Annual NOI" value={fmtMoney(r.noiAnnual)} color="#aaa" />
      </div>
      {coveredByTenants && (
        <div style={{ background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#00ff88", fontWeight: 700, marginBottom: 12 }}>
          🎉 Your tenants cover the entire building — you live there for free and keep {fmtMoney(-r.effectiveHousingCost, 2)}/mo.
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, flex: "1 1 300px" }}>
          <div style={{ fontSize: 11, color: "#0ea5e9", fontWeight: 700, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Rent Roll</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: 1, textTransform: "uppercase", paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ flex: 1 }}>Unit</span>
            <span style={{ width: 90, textAlign: "right" }}>Market Rent</span>
            <span style={{ width: 90, textAlign: "right" }}>Collected</span>
          </div>
          {r.units.map(function (u) {
            return (
              <div key={u.index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ flex: 1, color: "#ccc", display: "flex", alignItems: "center", gap: 6 }}>
                  Unit {u.unitNumber}
                  {u.isOwnerOccupied && (
                    <span style={{ background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.4)", color: "#818cf8", borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>YOU</span>
                  )}
                </span>
                <span style={{ width: 90, textAlign: "right", color: "#999", fontFamily: "monospace" }}>{fmtMoney(u.marketRent, 2)}</span>
                <span style={{ width: 90, textAlign: "right", color: u.isOwnerOccupied ? "#555" : "#00ff88", fontFamily: "monospace", fontWeight: 700 }}>
                  {u.isOwnerOccupied ? "—" : fmtMoney(u.effectiveRent, 2)}
                </span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0 2px", fontSize: 12, fontWeight: 800 }}>
            <span style={{ color: "#999", flex: 1 }}>Totals (after {inputs.vacancyRate || 0}% vacancy)</span>
            <span style={{ width: 90, textAlign: "right", color: "#999", fontFamily: "monospace" }}>{fmtMoney(r.totalPotentialIncome, 2)}</span>
            <span style={{ width: 90, textAlign: "right", color: "#00ff88", fontFamily: "monospace" }}>{fmtMoney(r.actualIncome, 2)}</span>
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 8 }}>
            Market column is the building fully rented; collected is what tenants actually pay you.
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, flex: "1 1 300px" }}>
          <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Monthly Breakdown</div>
          <ExpenseRow label="Mortgage (P&I)" value={fmtMoney(r.mortgageMonthly, 2)} />
          <ExpenseRow label="Property taxes" value={fmtMoney(r.taxesMonthly, 2)} />
          <ExpenseRow label="Insurance" value={fmtMoney(r.insuranceMonthly, 2)} />
          <ExpenseRow label="Maintenance + CapEx" value={fmtMoney(r.maintenanceMonthly, 2)} />
          <ExpenseRow label="Management" value={fmtMoney(r.managementMonthly, 2)} />
          <ExpenseRow label="HOA" value={fmtMoney(r.hoaMonthly, 2)} />
          <ExpenseRow label="Utilities" value={fmtMoney(r.utilitiesMonthly, 2)} />
          <ExpenseRow label="Total expenses" value={fmtMoney(r.totalMonthlyExpenses, 2)} />
          <ExpenseRow label="Less rent collected" value={"-" + fmtMoney(r.actualIncome, 2)} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px", fontSize: 13, fontWeight: 800 }}>
            <span style={{ color: "#999" }}>Effective housing cost</span>
            <span style={{ color: costColor, fontFamily: "monospace" }}>{fmtMoney(r.effectiveHousingCost, 2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 2px", fontSize: 12 }}>
            <span style={{ color: "#777" }}>vs. renting your unit at</span>
            <span style={{ color: "#ccc", fontFamily: "monospace", fontWeight: 700 }}>{fmtMoney(r.ownerUnitMarketRent, 2)}</span>
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 8 }}>
            Maintenance accrues on all units; management only on rent you collect.
          </div>
        </div>
      </div>
    </div>
  );
}
