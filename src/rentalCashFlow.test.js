import {
  calculateRentalCashFlow,
  monthlyMortgagePayment,
  resolveAmount,
} from "./rentalCashFlow";

describe("monthlyMortgagePayment", () => {
  test("matches known amortization values", () => {
    // $100k @ 6% / 30yr = $599.55 and $80k = $479.64 are standard reference values
    expect(monthlyMortgagePayment(100000, 6, 30)).toBeCloseTo(599.55, 2);
    expect(monthlyMortgagePayment(80000, 6, 30)).toBeCloseTo(479.64, 2);
    expect(monthlyMortgagePayment(150000, 6.5, 30)).toBeCloseTo(948.1, 1);
  });

  test("zero interest divides principal evenly", () => {
    expect(monthlyMortgagePayment(120000, 0, 10)).toBeCloseTo(1000, 10);
  });

  test("no loan or no term means no payment", () => {
    expect(monthlyMortgagePayment(0, 6, 30)).toBe(0);
    expect(monthlyMortgagePayment(100000, 6, 0)).toBe(0);
  });
});

describe("resolveAmount", () => {
  test("percent mode scales off purchase price", () => {
    expect(resolveAmount(20, "percent", 100000)).toBe(20000);
  });
  test("dollar mode passes through", () => {
    expect(resolveAmount(25000, "dollar", 100000)).toBe(25000);
  });
});

describe("calculateRentalCashFlow — example deal (hand-verified)", () => {
  // $100k purchase, 20% down, 6%/30yr, 3% closing, $5k rehab,
  // $1,200 rent, 5% vacancy, $1,800 taxes, $1,200 insurance,
  // 10% management, 10% maintenance/CapEx.
  const deal = {
    purchasePrice: 100000,
    downPayment: 20,
    downPaymentMode: "percent",
    interestRate: 6,
    loanTermYears: 30,
    closingCosts: 3,
    closingCostsMode: "percent",
    rehabCosts: 5000,
    monthlyRent: 1200,
    vacancyRate: 5,
    propertyTaxesAnnual: 1800,
    insuranceAnnual: 1200,
    managementRate: 10,
    maintenanceRate: 10,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    rentGrowthRate: 0,
  };
  const r = calculateRentalCashFlow(deal);

  test("loan amount = purchase price - down payment", () => {
    expect(r.downPayment).toBe(20000);
    expect(r.loanAmount).toBe(80000);
  });

  test("mortgage P&I", () => {
    expect(r.mortgageMonthly).toBeCloseTo(479.64, 2);
  });

  test("gross monthly income = rent x (1 - vacancy)", () => {
    expect(r.grossMonthlyIncome).toBeCloseTo(1140, 10);
  });

  test("expense line items", () => {
    expect(r.taxesMonthly).toBeCloseTo(150, 10);
    expect(r.insuranceMonthly).toBeCloseTo(100, 10);
    expect(r.managementMonthly).toBeCloseTo(120, 10);
    expect(r.maintenanceMonthly).toBeCloseTo(120, 10);
    // 479.64 + 150 + 100 + 120 + 120
    expect(r.totalMonthlyExpenses).toBeCloseTo(969.64, 2);
  });

  test("monthly and annual cash flow", () => {
    expect(r.monthlyCashFlow).toBeCloseTo(170.36, 2);
    expect(r.annualCashFlow).toBeCloseTo(2044.31, 1);
  });

  test("NOI excludes the mortgage; cap rate = NOI / price", () => {
    // (1140 income - 490 opex) x 12 = 7800
    expect(r.noiAnnual).toBeCloseTo(7800, 10);
    expect(r.capRate).toBeCloseTo(0.078, 10);
  });

  test("total cash invested and cash-on-cash return", () => {
    // 20,000 down + 3,000 closing + 5,000 rehab
    expect(r.totalCashInvested).toBe(28000);
    expect(r.cashOnCashReturn).toBeCloseTo(2044.31 / 28000, 4);
  });

  test("flat projection repeats year-1 cash flow", () => {
    expect(r.projection).toHaveLength(5);
    r.projection.forEach((row) => {
      expect(row.annualCashFlow).toBeCloseTo(r.annualCashFlow, 6);
    });
    expect(r.projection[4].cumulativeCashFlow).toBeCloseTo(r.annualCashFlow * 5, 6);
  });
});

describe("calculateRentalCashFlow — variants", () => {
  test("dollar-mode down payment and closing costs", () => {
    const r = calculateRentalCashFlow({
      purchasePrice: 250000,
      downPayment: 50000,
      downPaymentMode: "dollar",
      closingCosts: 6000,
      closingCostsMode: "dollar",
      interestRate: 7,
      loanTermYears: 30,
      monthlyRent: 2000,
      vacancyRate: 5,
    });
    expect(r.loanAmount).toBe(200000);
    expect(r.totalCashInvested).toBe(56000);
    expect(r.mortgageMonthly).toBeCloseTo(1330.6, 1);
  });

  test("all-cash purchase has no mortgage payment", () => {
    const r = calculateRentalCashFlow({
      purchasePrice: 100000,
      downPayment: 100,
      downPaymentMode: "percent",
      interestRate: 6,
      loanTermYears: 30,
      monthlyRent: 1000,
      vacancyRate: 0,
    });
    expect(r.loanAmount).toBe(0);
    expect(r.mortgageMonthly).toBe(0);
    expect(r.monthlyCashFlow).toBeCloseTo(1000, 10);
  });

  test("rent growth compounds annually; fixed costs stay flat", () => {
    const r = calculateRentalCashFlow({
      purchasePrice: 100000,
      downPayment: 20,
      downPaymentMode: "percent",
      interestRate: 6,
      loanTermYears: 30,
      closingCosts: 3,
      rehabCosts: 5000,
      monthlyRent: 1200,
      vacancyRate: 5,
      propertyTaxesAnnual: 1800,
      insuranceAnnual: 1200,
      managementRate: 10,
      maintenanceRate: 10,
      rentGrowthRate: 3,
    });
    // Year 1 unchanged
    expect(r.projection[0].annualCashFlow).toBeCloseTo(2044.31, 1);
    // Year 2: rent 1236 -> 12 x (1236*.95 - (479.6404 + 250 + 1236*.20)) = 2368.31
    expect(r.projection[1].monthlyRent).toBeCloseTo(1236, 10);
    expect(r.projection[1].annualCashFlow).toBeCloseTo(2368.31, 1);
    expect(r.projection[1].cumulativeCashFlow).toBeCloseTo(4412.63, 1);
    // Year 5: rent = 1200 * 1.03^4
    expect(r.projection[4].monthlyRent).toBeCloseTo(1200 * Math.pow(1.03, 4), 6);
  });

  test("degenerate inputs do not produce NaN", () => {
    const r = calculateRentalCashFlow({ purchasePrice: 0, downPayment: 0, monthlyRent: 0 });
    expect(r.capRate).toBe(0);
    expect(r.cashOnCashReturn).toBe(0);
    expect(Number.isNaN(r.monthlyCashFlow)).toBe(false);
  });
});
