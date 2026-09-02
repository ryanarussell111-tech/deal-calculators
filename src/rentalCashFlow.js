// Core math for the Rental Property Cash Flow calculator.
// Pure functions only — no React, no I/O — so every number is unit-testable.

// Standard amortization payment: L * r / (1 - (1+r)^-n), r = monthly rate.
export function monthlyMortgagePayment(loanAmount, annualRatePct, termYears) {
  if (loanAmount <= 0 || termYears <= 0) return 0;
  const n = termYears * 12;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return loanAmount / n;
  return (loanAmount * r) / (1 - Math.pow(1 + r, -n));
}

// Resolves an input that can be entered as a % of purchase price or a flat $.
export function resolveAmount(value, mode, purchasePrice) {
  const v = Number(value) || 0;
  return mode === "percent" ? (purchasePrice * v) / 100 : v;
}

/**
 * @param {object} inputs
 * @param {number} inputs.purchasePrice
 * @param {number} inputs.downPayment            value in $ or % per downPaymentMode
 * @param {"percent"|"dollar"} [inputs.downPaymentMode="percent"]
 * @param {number} inputs.interestRate           annual %, e.g. 6.5
 * @param {number} inputs.loanTermYears
 * @param {number} [inputs.points=0]             % of the loan, paid upfront at closing
 * @param {number} [inputs.closingCosts=0]       value in $ or % per closingCostsMode
 * @param {"percent"|"dollar"} [inputs.closingCostsMode="percent"]
 * @param {number} [inputs.rehabCosts=0]
 * @param {number} inputs.monthlyRent
 * @param {number} [inputs.vacancyRate=5]        % of rent lost to vacancy
 * @param {number} [inputs.propertyTaxesAnnual=0]
 * @param {number} [inputs.insuranceAnnual=0]
 * @param {number} [inputs.managementRate=8]     % of gross rent
 * @param {number} [inputs.maintenanceRate=8]    maintenance + CapEx reserve, % of gross rent
 * @param {number} [inputs.hoaMonthly=0]
 * @param {number} [inputs.utilitiesMonthly=0]   owner-paid utilities per month
 * @param {number} [inputs.rentGrowthRate=0]     annual %, applied in the projection only
 */
export function calculateRentalCashFlow(inputs) {
  const purchasePrice = Number(inputs.purchasePrice) || 0;
  const downPayment = resolveAmount(inputs.downPayment, inputs.downPaymentMode || "percent", purchasePrice);
  const closingCosts = resolveAmount(inputs.closingCosts || 0, inputs.closingCostsMode || "percent", purchasePrice);
  const rehabCosts = Number(inputs.rehabCosts) || 0;
  const monthlyRent = Number(inputs.monthlyRent) || 0;
  const vacancyRate = (Number(inputs.vacancyRate) || 0) / 100;
  const taxesMonthly = (Number(inputs.propertyTaxesAnnual) || 0) / 12;
  const insuranceMonthly = (Number(inputs.insuranceAnnual) || 0) / 12;
  const managementRate = (Number(inputs.managementRate) || 0) / 100;
  const maintenanceRate = (Number(inputs.maintenanceRate) || 0) / 100;
  const hoaMonthly = Number(inputs.hoaMonthly) || 0;
  const utilitiesMonthly = Number(inputs.utilitiesMonthly) || 0;
  const rentGrowthRate = (Number(inputs.rentGrowthRate) || 0) / 100;

  const loanAmount = Math.max(0, purchasePrice - downPayment);
  const mortgageMonthly = monthlyMortgagePayment(
    loanAmount,
    Number(inputs.interestRate) || 0,
    Number(inputs.loanTermYears) || 0
  );

  // Points are a percentage of the loan paid upfront, so they are part of the
  // cash needed at closing but never part of the monthly payment.
  const pointsRate = (Number(inputs.points) || 0) / 100;
  const pointsCost = loanAmount * pointsRate;

  // Fixed monthly operating costs don't scale with rent; % based ones do.
  const fixedOpexMonthly = taxesMonthly + insuranceMonthly + hoaMonthly + utilitiesMonthly;
  const cashFlowForRent = (rent) => {
    const grossIncome = rent * (1 - vacancyRate);
    const opex = fixedOpexMonthly + rent * (managementRate + maintenanceRate);
    return grossIncome - (opex + mortgageMonthly);
  };

  const grossMonthlyIncome = monthlyRent * (1 - vacancyRate);
  const managementMonthly = monthlyRent * managementRate;
  const maintenanceMonthly = monthlyRent * maintenanceRate;
  const operatingExpensesMonthly = fixedOpexMonthly + managementMonthly + maintenanceMonthly;
  const totalMonthlyExpenses = operatingExpensesMonthly + mortgageMonthly;
  const monthlyCashFlow = grossMonthlyIncome - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  const noiAnnual = (grossMonthlyIncome - operatingExpensesMonthly) * 12;
  const capRate = purchasePrice > 0 ? noiAnnual / purchasePrice : 0;

  const totalCashInvested = downPayment + closingCosts + rehabCosts + pointsCost;
  const cashOnCashReturn = totalCashInvested > 0 ? annualCashFlow / totalCashInvested : 0;

  // Year-by-year projection: rent compounds annually; taxes, insurance, HOA,
  // utilities, and the mortgage are held flat.
  const projection = [];
  let cumulative = 0;
  for (let year = 1; year <= 5; year++) {
    const rentThisYear = monthlyRent * Math.pow(1 + rentGrowthRate, year - 1);
    const annual = cashFlowForRent(rentThisYear) * 12;
    cumulative += annual;
    projection.push({ year, monthlyRent: rentThisYear, annualCashFlow: annual, cumulativeCashFlow: cumulative });
  }

  return {
    loanAmount,
    downPayment,
    closingCosts,
    rehabCosts,
    pointsRate,
    pointsCost,
    mortgageMonthly,
    grossMonthlyIncome,
    taxesMonthly,
    insuranceMonthly,
    managementMonthly,
    maintenanceMonthly,
    hoaMonthly,
    utilitiesMonthly,
    operatingExpensesMonthly,
    totalMonthlyExpenses,
    monthlyCashFlow,
    annualCashFlow,
    noiAnnual,
    capRate,
    totalCashInvested,
    cashOnCashReturn,
    projection,
  };
}
