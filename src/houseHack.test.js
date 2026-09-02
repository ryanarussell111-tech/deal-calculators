import { calculateHouseHack } from "./houseHack";

// $300k duplex, 5% down, 6.5%/30yr, 3% closing. Owner lives in unit 1
// (market rent $1,500), unit 2 rents for $1,600. 5% vacancy, $3,600 taxes,
// $1,800 insurance, $150/mo owner-paid utilities, 8% maintenance/CapEx,
// self-managed.
const duplex = {
  purchasePrice: 300000,
  downPayment: 5,
  downPaymentMode: "percent",
  interestRate: 6.5,
  loanTermYears: 30,
  closingCosts: 3,
  closingCostsMode: "percent",
  numberOfUnits: 2,
  ownerUnitIndex: 0,
  unitRents: [1500, 1600],
  vacancyRate: 5,
  propertyTaxesAnnual: 3600,
  insuranceAnnual: 1800,
  hoaMonthly: 0,
  utilitiesMonthly: 150,
  managementRate: 0,
  maintenanceRate: 8,
};

describe("calculateHouseHack — duplex example (hand-verified)", () => {
  const r = calculateHouseHack(duplex);

  test("financing", () => {
    expect(r.downPayment).toBe(15000);
    expect(r.loanAmount).toBe(285000);
    expect(r.closingCosts).toBe(9000);
    expect(r.totalCashInvested).toBe(24000);
    expect(r.mortgageMonthly).toBeCloseTo(1801.39, 2);
  });

  test("potential income counts every unit, actual income counts tenants only", () => {
    expect(r.totalPotentialRent).toBe(3100);
    expect(r.totalPotentialIncome).toBeCloseTo(2945, 10); // 3100 x 0.95
    expect(r.actualRentRoll).toBe(1600);
    expect(r.actualIncome).toBeCloseTo(1520, 10); // 1600 x 0.95
    expect(r.ownerUnitMarketRent).toBe(1500);
  });

  test("expense line items", () => {
    expect(r.taxesMonthly).toBeCloseTo(300, 10);
    expect(r.insuranceMonthly).toBeCloseTo(150, 10);
    expect(r.utilitiesMonthly).toBe(150);
    // Maintenance accrues on the whole building, owner's unit included
    expect(r.maintenanceMonthly).toBeCloseTo(248, 10); // 8% of 3100
    expect(r.managementMonthly).toBe(0);
    expect(r.operatingExpensesMonthly).toBeCloseTo(848, 10);
    expect(r.totalMonthlyExpenses).toBeCloseTo(2649.39, 2);
  });

  test("headline: effective housing cost and savings vs renting", () => {
    // 2649.3939 total expenses - 1520 collected from unit 2
    expect(r.effectiveHousingCost).toBeCloseTo(1129.39, 2);
    // 1500 market rent - 1129.3939 effective cost
    expect(r.monthlySavings).toBeCloseTo(370.61, 2);
  });

  test("cap rate and cash-on-cash use the fully-rented scenario", () => {
    expect(r.noiAnnual).toBeCloseTo(25164, 6); // (2945 - 848) x 12
    expect(r.capRate).toBeCloseTo(0.08388, 5);
    expect(r.fullyRentedMonthlyCashFlow).toBeCloseTo(295.61, 2);
    expect(r.cashOnCashReturn).toBeCloseTo(0.1478, 4);
  });

  test("per-unit breakdown", () => {
    expect(r.units).toHaveLength(2);
    expect(r.units[0]).toMatchObject({ unitNumber: 1, isOwnerOccupied: true, marketRent: 1500, collectedRent: 0 });
    expect(r.units[1]).toMatchObject({ unitNumber: 2, isOwnerOccupied: false, marketRent: 1600, collectedRent: 1600 });
    expect(r.units[1].effectiveRent).toBeCloseTo(1520, 10);
    expect(r.units[0].effectiveRent).toBe(0);
  });

  test("internal consistency of the headline figures", () => {
    expect(r.effectiveHousingCost).toBeCloseTo(r.totalMonthlyExpenses - r.actualIncome, 8);
    expect(r.monthlySavings).toBeCloseTo(r.ownerUnitMarketRent - r.effectiveHousingCost, 8);
    expect(r.totalMonthlyExpenses).toBeCloseTo(r.operatingExpensesMonthly + r.mortgageMonthly, 8);
  });
});

describe("calculateHouseHack — which unit the owner takes", () => {
  test("occupying the pricier unit costs more but returns are unchanged", () => {
    const base = calculateHouseHack(duplex);
    const swapped = calculateHouseHack(Object.assign({}, duplex, { ownerUnitIndex: 1 }));

    // Now collecting the $1,500 unit instead of the $1,600 unit
    expect(swapped.actualRentRoll).toBe(1500);
    expect(swapped.effectiveHousingCost).toBeCloseTo(1224.39, 2);
    expect(swapped.effectiveHousingCost).toBeGreaterThan(base.effectiveHousingCost);
    // ...but the owner's unit is worth more, so savings rise too
    expect(swapped.ownerUnitMarketRent).toBe(1600);
    expect(swapped.monthlySavings).toBeCloseTo(375.61, 2);

    // Fully-rented metrics describe the building, not the living arrangement
    expect(swapped.capRate).toBeCloseTo(base.capRate, 10);
    expect(swapped.cashOnCashReturn).toBeCloseTo(base.cashOnCashReturn, 10);
  });
});

describe("calculateHouseHack — variants", () => {
  test("management is charged on collected rent, not the owner's unit", () => {
    const r = calculateHouseHack(Object.assign({}, duplex, { managementRate: 10 }));
    expect(r.managementMonthly).toBeCloseTo(160, 10); // 10% of the $1,600 tenant unit
    expect(r.managementIfFullyRented).toBeCloseTo(310, 10); // 10% of all $3,100
    expect(r.operatingExpensesMonthly).toBeCloseTo(848 + 160, 10);
    expect(r.operatingExpensesIfFullyRented).toBeCloseTo(848 + 310, 10);
  });

  test("triplex with the owner in unit 1", () => {
    const r = calculateHouseHack(Object.assign({}, duplex, {
      numberOfUnits: 3,
      unitRents: [1200, 1100, 1000],
      ownerUnitIndex: 0,
    }));
    expect(r.units).toHaveLength(3);
    expect(r.totalPotentialRent).toBe(3300);
    expect(r.actualRentRoll).toBe(2100); // 1100 + 1000
    expect(r.actualIncome).toBeCloseTo(1995, 10);
    expect(r.maintenanceMonthly).toBeCloseTo(264, 10); // 8% of 3300
  });

  test("fourplex collects from three units", () => {
    const r = calculateHouseHack(Object.assign({}, duplex, {
      numberOfUnits: 4,
      unitRents: [1000, 1000, 1000, 1000],
      ownerUnitIndex: 3,
    }));
    expect(r.units).toHaveLength(4);
    expect(r.units[3].isOwnerOccupied).toBe(true);
    expect(r.actualRentRoll).toBe(3000);
    expect(r.totalPotentialRent).toBe(4000);
  });

  test("a rent array longer than the unit count is trimmed", () => {
    const r = calculateHouseHack(Object.assign({}, duplex, {
      numberOfUnits: 2,
      unitRents: [1500, 1600, 9999, 9999],
    }));
    expect(r.units).toHaveLength(2);
    expect(r.totalPotentialRent).toBe(3100);
  });

  test("a rent array shorter than the unit count fills with zero", () => {
    const r = calculateHouseHack(Object.assign({}, duplex, {
      numberOfUnits: 3,
      unitRents: [1500, 1600],
    }));
    expect(r.units).toHaveLength(3);
    expect(r.units[2].marketRent).toBe(0);
    expect(r.totalPotentialRent).toBe(3100);
  });

  test("an out-of-range owner unit index is clamped into the building", () => {
    const high = calculateHouseHack(Object.assign({}, duplex, { ownerUnitIndex: 7 }));
    expect(high.ownerUnitIndex).toBe(1);
    expect(high.units[1].isOwnerOccupied).toBe(true);

    const low = calculateHouseHack(Object.assign({}, duplex, { ownerUnitIndex: -3 }));
    expect(low.ownerUnitIndex).toBe(0);
    expect(low.units[0].isOwnerOccupied).toBe(true);
  });

  test("all-cash purchase has no mortgage, so housing cost is operating only", () => {
    const r = calculateHouseHack(Object.assign({}, duplex, {
      downPayment: 100,
      downPaymentMode: "percent",
    }));
    expect(r.loanAmount).toBe(0);
    expect(r.mortgageMonthly).toBe(0);
    expect(r.effectiveHousingCost).toBeCloseTo(848 - 1520, 8); // negative: tenant covers it
    expect(r.monthlySavings).toBeGreaterThan(1500);
  });

  test("a negative effective cost means the tenants more than cover the building", () => {
    const r = calculateHouseHack(Object.assign({}, duplex, { unitRents: [1500, 4000] }));
    expect(r.effectiveHousingCost).toBeLessThan(0);
    expect(r.monthlySavings).toBeGreaterThan(r.ownerUnitMarketRent);
  });

  test("degenerate inputs do not produce NaN", () => {
    const r = calculateHouseHack({});
    expect(r.capRate).toBe(0);
    expect(r.cashOnCashReturn).toBe(0);
    expect(Number.isNaN(r.effectiveHousingCost)).toBe(false);
    expect(Number.isNaN(r.monthlySavings)).toBe(false);
    expect(r.units).toHaveLength(2); // defaults to a duplex
  });
});
