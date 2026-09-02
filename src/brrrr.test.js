import { calculateBrrrr } from "./brrrr";

describe("calculateBrrrr — example deal (hand-verified)", () => {
  // Buy $100k with 20% down on a 10% interest-only bridge loan, $3k closing,
  // $25k rehab, 6-month hold at $500/mo. Refi at $160k ARV, 75% LTV,
  // 6.5%/30yr, $4k refi closing. Rent $1,500 after the refi.
  const deal = {
    purchasePrice: 100000,
    purchaseClosingCosts: 3000,
    purchaseClosingCostsMode: "dollar",
    rehabCosts: 25000,
    financing: "loan",
    downPayment: 20,
    downPaymentMode: "percent",
    purchaseLoanRate: 10,
    holdingMonths: 6,
    holdingCostsMonthly: 500,
    arv: 160000,
    refiLtv: 75,
    refiRate: 6.5,
    refiTermYears: 30,
    refiClosingCosts: 4000,
    refiClosingCostsMode: "dollar",
    monthlyRent: 1500,
    vacancyRate: 5,
    propertyTaxesAnnual: 1800,
    insuranceAnnual: 1200,
    managementRate: 8,
    maintenanceRate: 8,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    rentGrowthRate: 0,
  };
  const r = calculateBrrrr(deal);

  test("acquisition financing", () => {
    expect(r.downPayment).toBe(20000);
    expect(r.initialLoanAmount).toBe(80000);
  });

  test("holding costs: interest-only bridge + monthly carry", () => {
    // 80,000 x 10% / 12 = 666.67/mo -> 4,000 over 6 months, + 3,000 carry
    expect(r.holdingInterestMonthly).toBeCloseTo(666.67, 2);
    expect(r.holdingInterest).toBeCloseTo(4000, 10);
    expect(r.totalHoldingCosts).toBeCloseTo(7000, 10);
  });

  test("total project cost and cash invested pre-refi", () => {
    // 100,000 + 3,000 + 25,000 + 7,000
    expect(r.totalProjectCost).toBeCloseTo(135000, 10);
    // 20,000 down + 3,000 + 25,000 + 7,000
    expect(r.totalCashInvested).toBeCloseTo(55000, 10);
  });

  test("refinance: loan, cash out, cash left in deal", () => {
    expect(r.refiLoanAmount).toBe(120000); // 160k x 75%
    // 120,000 - 80,000 payoff - 4,000 closing
    expect(r.cashOut).toBeCloseTo(36000, 10);
    expect(r.cashLeftInDeal).toBeCloseTo(19000, 10);
    expect(r.equityAfterRefi).toBe(40000);
    expect(r.percentCashRecovered).toBeCloseTo(36000 / 55000, 10);
  });

  test("post-refi rental phase runs on the refi loan", () => {
    expect(r.rental.loanAmount).toBe(120000);
    // $120k @ 6.5%/30yr
    expect(r.rental.mortgageMonthly).toBeCloseTo(758.48, 2);
    expect(r.rental.grossMonthlyIncome).toBeCloseTo(1425, 10);
    // 1425 - (758.48 + 150 + 100 + 120 + 120)
    expect(r.rental.monthlyCashFlow).toBeCloseTo(176.52, 1);
    // NOI excludes mortgage: (1425 - 490) x 12; cap rate is on ARV
    expect(r.rental.noiAnnual).toBeCloseTo(11220, 10);
    expect(r.rental.capRate).toBeCloseTo(11220 / 160000, 10);
  });

  test("cash-on-cash uses cash left in the deal", () => {
    expect(r.cashOnCashReturn).toBeCloseTo(r.rental.annualCashFlow / 19000, 10);
    expect(r.cashOnCashReturn).toBeCloseTo(0.1115, 3);
  });
});

describe("calculateBrrrr — variants", () => {
  const base = {
    purchasePrice: 80000,
    purchaseClosingCosts: 2000,
    purchaseClosingCostsMode: "dollar",
    rehabCosts: 20000,
    holdingMonths: 4,
    holdingCostsMonthly: 400,
    arv: 150000,
    refiLtv: 75,
    refiRate: 7,
    refiTermYears: 30,
    refiClosingCosts: 3,
    refiClosingCostsMode: "percent",
    monthlyRent: 1400,
    vacancyRate: 5,
    propertyTaxesAnnual: 1500,
    insuranceAnnual: 1100,
    managementRate: 8,
    maintenanceRate: 8,
  };

  test("all-cash purchase: no bridge loan, full price out of pocket", () => {
    const r = calculateBrrrr(Object.assign({}, base, { financing: "cash" }));
    expect(r.initialLoanAmount).toBe(0);
    expect(r.holdingInterest).toBe(0);
    // 80,000 + 2,000 + 20,000 + 1,600 carry
    expect(r.totalCashInvested).toBeCloseTo(103600, 10);
    // Refi loan 112,500, closing 3% = 3,375 -> cash out 109,125
    expect(r.cashOut).toBeCloseTo(109125, 10);
    expect(r.cashLeftInDeal).toBeCloseTo(-5525, 10);
    // All cash recovered and then some -> infinite CoC
    expect(r.cashOnCashReturn).toBe(Infinity);
    expect(r.percentCashRecovered).toBeCloseTo(109125 / 103600, 10);
  });

  test("refi that under-covers the payoff needs cash at closing", () => {
    const r = calculateBrrrr(Object.assign({}, base, {
      financing: "loan",
      downPayment: 10,
      purchaseLoanRate: 12,
      arv: 90000, // weak ARV: refi loan 67,500 < 72,000 payoff
    }));
    expect(r.initialLoanAmount).toBe(72000);
    expect(r.refiLoanAmount).toBeCloseTo(67500, 10);
    // 67,500 - 72,000 - 2,025 closing = -6,525
    expect(r.cashOut).toBeCloseTo(-6525, 10);
    expect(r.cashLeftInDeal).toBeCloseTo(r.totalCashInvested + 6525, 6);
    expect(r.percentCashRecovered).toBe(0);
  });

  test("degenerate inputs do not produce NaN", () => {
    const r = calculateBrrrr({});
    expect(Number.isNaN(r.totalCashInvested)).toBe(false);
    expect(Number.isNaN(r.cashOut)).toBe(false);
    expect(Number.isNaN(r.rental.monthlyCashFlow)).toBe(false);
    expect(r.cashOnCashReturn).toBe(Infinity); // zero cash left in an empty deal
  });
});
