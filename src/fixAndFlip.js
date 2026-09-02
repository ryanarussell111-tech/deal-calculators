// Core math for the Fix & Flip calculator: buy, renovate, and resell.
// Reuses the amortization and %/$ helpers from the rental core.

import { monthlyMortgagePayment, resolveAmount } from "./rentalCashFlow";

/**
 * Notes on two conventions worth knowing:
 *
 * - Points are charged on the LOAN amount, which is how hard money is quoted.
 *   They are paid at closing, so they land in both cash invested and project cost.
 * - Sale closing costs in percent mode are a percent of the SALE price, not of
 *   the purchase price, which is why the breakeven solve has to account for
 *   them scaling with the price it is solving for.
 *
 * @param {object} inputs
 * @param {number} inputs.purchasePrice
 * @param {number} [inputs.purchaseClosingCosts=0]   $ or % of purchase price
 * @param {"percent"|"dollar"} [inputs.purchaseClosingCostsMode="percent"]
 * @param {number} [inputs.rehabBudget=0]
 * @param {number} [inputs.holdingMonths=6]
 * @param {number} [inputs.downPayment=0]            $ or % of purchase price
 * @param {"percent"|"dollar"} [inputs.downPaymentMode="percent"]
 * @param {number} [inputs.interestRate=0]           annual %
 * @param {"hardMoney"|"conventional"} [inputs.loanType="hardMoney"]
 * @param {number} [inputs.points=0]                 % of loan, hard money only
 * @param {boolean} [inputs.interestOnly=true]       interest-only during the hold
 * @param {number} [inputs.loanTermYears=30]         only used when amortizing
 * @param {number} [inputs.monthlyTaxes=0]
 * @param {number} [inputs.monthlyInsurance=0]
 * @param {number} [inputs.monthlyUtilities=0]
 * @param {number} inputs.arv                        after-repair value
 * @param {number} [inputs.commissionRate=6]         % of sale price
 * @param {number} [inputs.saleClosingCosts=0]       $ or % of sale price
 * @param {"percent"|"dollar"} [inputs.saleClosingCostsMode="percent"]
 */
export function calculateFixAndFlip(inputs) {
  const purchasePrice = Number(inputs.purchasePrice) || 0;
  const purchaseClosingCosts = resolveAmount(
    inputs.purchaseClosingCosts || 0,
    inputs.purchaseClosingCostsMode || "percent",
    purchasePrice
  );
  const rehabBudget = Number(inputs.rehabBudget) || 0;
  const holdingMonths = Math.max(0, Number(inputs.holdingMonths) || 0);

  const downPayment = resolveAmount(inputs.downPayment || 0, inputs.downPaymentMode || "percent", purchasePrice);
  const loanAmount = Math.max(0, purchasePrice - downPayment);

  // Points are a hard money cost; conventional financing carries none here.
  const loanType = inputs.loanType || "hardMoney";
  const pointsRate = loanType === "hardMoney" ? (Number(inputs.points) || 0) / 100 : 0;
  const pointsCost = loanAmount * pointsRate;

  const interestRate = Number(inputs.interestRate) || 0;
  const interestOnly = inputs.interestOnly === undefined ? true : !!inputs.interestOnly;
  const loanTermYears = inputs.loanTermYears === undefined ? 30 : Number(inputs.loanTermYears);
  const monthlyLoanPayment = interestOnly
    ? (loanAmount * interestRate) / 100 / 12
    : monthlyMortgagePayment(loanAmount, interestRate, loanTermYears);

  const monthlyTaxes = Number(inputs.monthlyTaxes) || 0;
  const monthlyInsurance = Number(inputs.monthlyInsurance) || 0;
  const monthlyUtilities = Number(inputs.monthlyUtilities) || 0;
  const monthlyHoldingCosts = monthlyTaxes + monthlyInsurance + monthlyUtilities + monthlyLoanPayment;
  const totalHoldingCosts = monthlyHoldingCosts * holdingMonths;

  const totalCashInvested = downPayment + purchaseClosingCosts + rehabBudget + pointsCost;
  // Holding costs are also paid out of pocket over the hold. Reported separately
  // so the headline ROI stays on the at-closing capital.
  const totalCashInvestedWithHolding = totalCashInvested + totalHoldingCosts;

  const totalProjectCost =
    purchasePrice + rehabBudget + totalHoldingCosts + purchaseClosingCosts + pointsCost;

  const arv = Number(inputs.arv) || 0;
  const commissionRate = (Number(inputs.commissionRate) || 0) / 100;
  const saleClosingMode = inputs.saleClosingCostsMode || "percent";
  const saleClosingInput = Number(inputs.saleClosingCosts) || 0;
  const saleClosingRate = saleClosingMode === "percent" ? saleClosingInput / 100 : 0;
  const saleClosingFlat = saleClosingMode === "percent" ? 0 : saleClosingInput;

  const commissionCost = arv * commissionRate;
  const saleClosingCost = saleClosingMode === "percent" ? arv * saleClosingRate : saleClosingFlat;
  const sellingCosts = commissionCost + saleClosingCost;

  const netProfit = arv - totalProjectCost - sellingCosts;
  const roi = totalCashInvested > 0 ? netProfit / totalCashInvested : 0;
  const profitMargin = arv > 0 ? netProfit / arv : 0;

  // 70% rule: don't pay more than 70% of ARV minus the rehab.
  const maxOfferSeventyRule = arv * 0.7 - rehabBudget;
  const passesSeventyRule = purchasePrice <= maxOfferSeventyRule;
  const seventyRuleDelta = purchasePrice - maxOfferSeventyRule;

  // Breakeven: solve S - projectCost - (S*commission + S*saleClosing% + flat) = 0
  // for S. Percentage selling costs scale with S, so they move to the left side.
  const sellingRate = commissionRate + saleClosingRate;
  const breakevenSalePrice = sellingRate < 1
    ? (totalProjectCost + saleClosingFlat) / (1 - sellingRate)
    : Infinity;

  return {
    purchasePrice,
    purchaseClosingCosts,
    rehabBudget,
    downPayment,
    loanAmount,
    loanType,
    pointsRate,
    pointsCost,
    interestOnly,
    monthlyLoanPayment,
    monthlyTaxes,
    monthlyInsurance,
    monthlyUtilities,
    monthlyHoldingCosts,
    holdingMonths,
    totalHoldingCosts,

    totalCashInvested,
    totalCashInvestedWithHolding,
    totalProjectCost,

    arv,
    commissionCost,
    saleClosingCost,
    sellingCosts,

    netProfit,
    roi,
    profitMargin,

    maxOfferSeventyRule,
    passesSeventyRule,
    seventyRuleDelta,
    breakevenSalePrice,
  };
}
