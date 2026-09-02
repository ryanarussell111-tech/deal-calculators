import { calculateFixAndFlip } from "./fixAndFlip";

// $150k purchase, 2% closing, $45k rehab, 6-month hold. Hard money: 20% down,
// 12% interest-only, 2 points. Carry $200 taxes + $100 insurance + $150
// utilities. Resell at $260k ARV with 6% commission and 1% sale closing.
const flip = {
  purchasePrice: 150000,
  purchaseClosingCosts: 2,
  purchaseClosingCostsMode: "percent",
  rehabBudget: 45000,
  holdingMonths: 6,
  downPayment: 20,
  downPaymentMode: "percent",
  interestRate: 12,
  loanType: "hardMoney",
  points: 2,
  interestOnly: true,
  monthlyTaxes: 200,
  monthlyInsurance: 100,
  monthlyUtilities: 150,
  arv: 260000,
  commissionRate: 6,
  saleClosingCosts: 1,
  saleClosingCostsMode: "percent",
};

describe("calculateFixAndFlip — example deal (hand-verified)", () => {
  const r = calculateFixAndFlip(flip);

  test("acquisition and financing", () => {
    expect(r.purchaseClosingCosts).toBe(3000);
    expect(r.downPayment).toBe(30000);
    expect(r.loanAmount).toBe(120000);
    expect(r.pointsCost).toBeCloseTo(2400, 10); // 2% of the $120k loan
  });

  test("interest-only carry during the hold", () => {
    expect(r.monthlyLoanPayment).toBeCloseTo(1200, 10); // 120000 x 12% / 12
    expect(r.monthlyHoldingCosts).toBeCloseTo(1650, 10); // + 200 + 100 + 150
    expect(r.totalHoldingCosts).toBeCloseTo(9900, 10); // x 6 months
  });

  test("cash invested and project cost", () => {
    // 30,000 down + 3,000 closing + 45,000 rehab + 2,400 points
    expect(r.totalCashInvested).toBeCloseTo(80400, 10);
    // ...plus the 9,900 carried over the hold
    expect(r.totalCashInvestedWithHolding).toBeCloseTo(90300, 10);
    // 150,000 + 45,000 + 9,900 + 3,000 + 2,400
    expect(r.totalProjectCost).toBeCloseTo(210300, 10);
  });

  test("selling costs", () => {
    expect(r.commissionCost).toBeCloseTo(15600, 10); // 6% of 260k
    expect(r.saleClosingCost).toBeCloseTo(2600, 10); // 1% of 260k
    expect(r.sellingCosts).toBeCloseTo(18200, 10);
  });

  test("headline: net profit and ROI", () => {
    // 260,000 - 210,300 - 18,200
    expect(r.netProfit).toBeCloseTo(31500, 10);
    expect(r.roi).toBeCloseTo(0.39179, 5); // 31,500 / 80,400
    expect(r.profitMargin).toBeCloseTo(31500 / 260000, 10);
  });

  test("70% rule fails on this deal", () => {
    // 260,000 x 0.7 - 45,000
    expect(r.maxOfferSeventyRule).toBeCloseTo(137000, 10);
    expect(r.passesSeventyRule).toBe(false);
    expect(r.seventyRuleDelta).toBeCloseTo(13000, 10); // overpaying by 13k
  });

  test("breakeven sale price", () => {
    // 210,300 / (1 - 6% - 1%)
    expect(r.breakevenSalePrice).toBeCloseTo(226129.03, 2);
  });

  test("selling at breakeven yields exactly zero profit", () => {
    const atBreakeven = calculateFixAndFlip(Object.assign({}, flip, { arv: r.breakevenSalePrice }));
    expect(atBreakeven.netProfit).toBeCloseTo(0, 6);
  });
});

describe("calculateFixAndFlip — variants", () => {
  test("70% rule passes when the purchase price is low enough", () => {
    const r = calculateFixAndFlip(Object.assign({}, flip, { purchasePrice: 130000 }));
    expect(r.maxOfferSeventyRule).toBeCloseTo(137000, 10);
    expect(r.passesSeventyRule).toBe(true);
    expect(r.seventyRuleDelta).toBeCloseTo(-7000, 10); // 7k of headroom
  });

  test("the 70% rule threshold is inclusive", () => {
    const r = calculateFixAndFlip(Object.assign({}, flip, { purchasePrice: 137000 }));
    expect(r.passesSeventyRule).toBe(true);
    expect(r.seventyRuleDelta).toBeCloseTo(0, 8);
  });

  test("conventional financing charges no points", () => {
    const r = calculateFixAndFlip(Object.assign({}, flip, { loanType: "conventional", points: 2 }));
    expect(r.pointsCost).toBe(0);
    expect(r.totalCashInvested).toBeCloseTo(78000, 10); // 2,400 less
    expect(r.totalProjectCost).toBeCloseTo(207900, 10);
    expect(r.netProfit).toBeCloseTo(33900, 10); // 2,400 more profit
  });

  test("amortizing carry costs more per month than interest-only", () => {
    const io = calculateFixAndFlip(flip);
    const am = calculateFixAndFlip(Object.assign({}, flip, { interestOnly: false, loanTermYears: 30 }));
    expect(am.monthlyLoanPayment).toBeCloseTo(1234.34, 1); // $120k @ 12% / 30yr
    expect(am.monthlyLoanPayment).toBeGreaterThan(io.monthlyLoanPayment);
    expect(am.netProfit).toBeLessThan(io.netProfit);
  });

  test("flat-dollar sale closing costs still breakeven exactly", () => {
    const inputs = Object.assign({}, flip, {
      saleClosingCosts: 3000,
      saleClosingCostsMode: "dollar",
    });
    const r = calculateFixAndFlip(inputs);
    expect(r.saleClosingCost).toBe(3000);
    // (210,300 + 3,000) / (1 - 6%)
    expect(r.breakevenSalePrice).toBeCloseTo(226914.89, 2);
    const atBreakeven = calculateFixAndFlip(Object.assign({}, inputs, { arv: r.breakevenSalePrice }));
    expect(atBreakeven.netProfit).toBeCloseTo(0, 6);
  });

  test("all-cash purchase has no loan, points, or loan carry", () => {
    const r = calculateFixAndFlip(Object.assign({}, flip, {
      downPayment: 100,
      downPaymentMode: "percent",
    }));
    expect(r.loanAmount).toBe(0);
    expect(r.pointsCost).toBe(0);
    expect(r.monthlyLoanPayment).toBe(0);
    expect(r.monthlyHoldingCosts).toBeCloseTo(450, 10);
    expect(r.totalCashInvested).toBeCloseTo(198000, 10); // 150k + 3k + 45k
  });

  test("a longer hold eats profit through carry", () => {
    const short = calculateFixAndFlip(Object.assign({}, flip, { holdingMonths: 3 }));
    const long = calculateFixAndFlip(Object.assign({}, flip, { holdingMonths: 12 }));
    expect(long.totalHoldingCosts).toBeCloseTo(19800, 10);
    expect(long.netProfit).toBeCloseTo(short.netProfit - 1650 * 9, 6);
    expect(long.netProfit).toBeLessThan(short.netProfit);
  });

  test("a deal that loses money reports negative profit and ROI", () => {
    const r = calculateFixAndFlip(Object.assign({}, flip, { arv: 190000 }));
    expect(r.netProfit).toBeLessThan(0);
    expect(r.roi).toBeLessThan(0);
    expect(r.arv).toBeLessThan(r.breakevenSalePrice);
  });

  test("degenerate inputs do not produce NaN", () => {
    const r = calculateFixAndFlip({});
    expect(r.roi).toBe(0);
    expect(Number.isNaN(r.netProfit)).toBe(false);
    expect(Number.isNaN(r.breakevenSalePrice)).toBe(false);
    expect(r.totalCashInvested).toBe(0);
  });
});
