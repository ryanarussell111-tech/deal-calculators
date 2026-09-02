// Core math for the BRRRR calculator (Buy, Rehab, Rent, Refinance, Repeat).
// Builds on the rental cash flow core: the post-refi hold phase is the same
// rental math, run against the refinance loan instead of a purchase loan.

import { calculateRentalCashFlow, resolveAmount } from "./rentalCashFlow";

/**
 * @param {object} inputs
 * Buy & Rehab:
 * @param {number} inputs.purchasePrice
 * @param {number} [inputs.purchaseClosingCosts=0]     $ or % of purchase price
 * @param {"percent"|"dollar"} [inputs.purchaseClosingCostsMode="percent"]
 * @param {number} [inputs.rehabCosts=0]
 * @param {"cash"|"loan"} [inputs.financing="loan"]    how the purchase is funded
 * @param {number} [inputs.downPayment=0]              $ or % of purchase price (loan financing)
 * @param {"percent"|"dollar"} [inputs.downPaymentMode="percent"]
 * @param {number} [inputs.purchaseLoanRate=0]         annual %; interest-only during the hold
 * Holding (rehab/seasoning period):
 * @param {number} [inputs.holdingMonths=6]
 * @param {number} [inputs.holdingCostsMonthly=0]      taxes/insurance/utilities while rehabbing
 * Refinance:
 * @param {number} inputs.arv                          after-repair value
 * @param {number} [inputs.refiLtv=75]                 % of ARV the new loan covers
 * @param {number} inputs.refiRate                     annual %
 * @param {number} [inputs.refiTermYears=30]
 * @param {number} [inputs.refiClosingCosts=0]         $ or % of the refi loan
 * @param {"percent"|"dollar"} [inputs.refiClosingCostsMode="percent"]
 * Rent (post-refi) — same fields as calculateRentalCashFlow:
 * monthlyRent, vacancyRate, propertyTaxesAnnual, insuranceAnnual,
 * managementRate, maintenanceRate, hoaMonthly, utilitiesMonthly, rentGrowthRate
 */
export function calculateBrrrr(inputs) {
  const purchasePrice = Number(inputs.purchasePrice) || 0;
  const purchaseClosingCosts = resolveAmount(
    inputs.purchaseClosingCosts || 0,
    inputs.purchaseClosingCostsMode || "percent",
    purchasePrice
  );
  const rehabCosts = Number(inputs.rehabCosts) || 0;
  const financing = inputs.financing || "loan";
  const holdingMonths = Number(inputs.holdingMonths) || 0;
  const holdingCostsMonthly = Number(inputs.holdingCostsMonthly) || 0;

  const downPayment = financing === "cash"
    ? purchasePrice
    : resolveAmount(inputs.downPayment || 0, inputs.downPaymentMode || "percent", purchasePrice);
  const initialLoanAmount = Math.max(0, purchasePrice - downPayment);

  // Acquisition loans (hard money / bridge) are modeled interest-only: the
  // full principal is still owed at refi and interest accrues monthly.
  const purchaseLoanRate = Number(inputs.purchaseLoanRate) || 0;
  const holdingInterestMonthly = (initialLoanAmount * purchaseLoanRate) / 100 / 12;
  const holdingInterest = holdingInterestMonthly * holdingMonths;
  const totalHoldingCosts = holdingCostsMonthly * holdingMonths + holdingInterest;

  const totalProjectCost = purchasePrice + purchaseClosingCosts + rehabCosts + totalHoldingCosts;
  // Everything except the borrowed principal comes out of pocket pre-refi.
  const totalCashInvested = downPayment + purchaseClosingCosts + rehabCosts + totalHoldingCosts;

  const arv = Number(inputs.arv) || 0;
  const refiLtv = Number(inputs.refiLtv) || 0;
  const refiLoanAmount = (arv * refiLtv) / 100;
  const refiClosingCosts = resolveAmount(
    inputs.refiClosingCosts || 0,
    inputs.refiClosingCostsMode || "percent",
    refiLoanAmount
  );

  // Negative cash-out means the refi doesn't cover the payoff + closing and
  // cash must be brought to the table.
  const cashOut = refiLoanAmount - initialLoanAmount - refiClosingCosts;
  const cashLeftInDeal = totalCashInvested - cashOut;
  const equityAfterRefi = arv - refiLoanAmount;
  const percentCashRecovered = totalCashInvested > 0 ? Math.max(0, cashOut) / totalCashInvested : 0;

  // Post-refi hold phase: rental math on the refi loan. Framing it as an
  // ARV-priced purchase with the equity as "down payment" makes the rental
  // core produce the right loan, payment, NOI, and cap rate (on ARV).
  const rental = calculateRentalCashFlow({
    purchasePrice: arv,
    downPayment: equityAfterRefi,
    downPaymentMode: "dollar",
    interestRate: Number(inputs.refiRate) || 0,
    loanTermYears: inputs.refiTermYears === undefined ? 30 : Number(inputs.refiTermYears),
    closingCosts: 0,
    closingCostsMode: "dollar",
    rehabCosts: 0,
    monthlyRent: inputs.monthlyRent,
    vacancyRate: inputs.vacancyRate,
    propertyTaxesAnnual: inputs.propertyTaxesAnnual,
    insuranceAnnual: inputs.insuranceAnnual,
    managementRate: inputs.managementRate,
    maintenanceRate: inputs.maintenanceRate,
    hoaMonthly: inputs.hoaMonthly,
    utilitiesMonthly: inputs.utilitiesMonthly,
    rentGrowthRate: inputs.rentGrowthRate,
  });

  // BRRRR cash-on-cash is measured against the cash still trapped in the
  // deal. Recovering it all (or more) makes the return infinite by convention.
  const cashOnCashReturn = cashLeftInDeal > 0 ? rental.annualCashFlow / cashLeftInDeal : Infinity;

  return {
    purchasePrice,
    purchaseClosingCosts,
    rehabCosts,
    downPayment,
    initialLoanAmount,
    holdingInterestMonthly,
    holdingInterest,
    totalHoldingCosts,
    totalProjectCost,
    totalCashInvested,
    arv,
    refiLoanAmount,
    refiClosingCosts,
    cashOut,
    cashLeftInDeal,
    equityAfterRefi,
    percentCashRecovered,
    cashOnCashReturn,
    rental,
  };
}
