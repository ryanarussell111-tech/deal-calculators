// Core math for the House Hacking calculator: owner occupies one unit of a
// small multifamily and rents the rest. Builds on the rental cash flow core.

import { monthlyMortgagePayment, resolveAmount } from "./rentalCashFlow";

/**
 * Percentage-based expenses need an explicit base, and the two differ:
 *
 * - Maintenance/CapEx is charged on TOTAL potential rent. The building wears
 *   out whether or not the owner is paying themselves rent, so the owner's own
 *   unit still accrues a reserve.
 * - Management is charged only on rent actually collected from tenants — you
 *   don't pay a manager to manage the unit you live in. For the fully-rented
 *   comparison it is charged on all units, since then every unit is a rental.
 *
 * @param {object} inputs
 * @param {number} inputs.purchasePrice
 * @param {number} inputs.downPayment                value in $ or % per downPaymentMode
 * @param {"percent"|"dollar"} [inputs.downPaymentMode="percent"]
 * @param {number} inputs.interestRate               annual %, e.g. 6.5
 * @param {number} inputs.loanTermYears
 * @param {number} [inputs.closingCosts=0]           value in $ or % per closingCostsMode
 * @param {"percent"|"dollar"} [inputs.closingCostsMode="percent"]
 * @param {number} [inputs.numberOfUnits=2]          2-4
 * @param {number} [inputs.ownerUnitIndex=0]         0-based index of the owner's unit
 * @param {number[]} inputs.unitRents                market rent for EVERY unit,
 *                                                   including the owner's
 * @param {number} [inputs.vacancyRate=5]            % of rent lost to vacancy
 * @param {number} [inputs.propertyTaxesAnnual=0]
 * @param {number} [inputs.insuranceAnnual=0]
 * @param {number} [inputs.hoaMonthly=0]
 * @param {number} [inputs.utilitiesMonthly=0]       owner-paid utilities per month
 * @param {number} [inputs.managementRate=0]         % of collected rent; 0 = self-managed
 * @param {number} [inputs.maintenanceRate=8]        maintenance + CapEx, % of total rent
 */
export function calculateHouseHack(inputs) {
  const purchasePrice = Number(inputs.purchasePrice) || 0;
  const downPayment = resolveAmount(inputs.downPayment, inputs.downPaymentMode || "percent", purchasePrice);
  const closingCosts = resolveAmount(inputs.closingCosts || 0, inputs.closingCostsMode || "percent", purchasePrice);

  const numberOfUnits = Math.max(1, Math.min(4, Number(inputs.numberOfUnits) || 2));
  const rawRents = Array.isArray(inputs.unitRents) ? inputs.unitRents : [];
  // Normalize to exactly numberOfUnits entries so a stale longer/shorter array
  // from the UI can't silently skew the totals.
  const unitRents = [];
  for (let i = 0; i < numberOfUnits; i++) unitRents.push(Number(rawRents[i]) || 0);

  const ownerUnitIndex = Math.max(0, Math.min(numberOfUnits - 1, Number(inputs.ownerUnitIndex) || 0));

  const vacancyRate = (Number(inputs.vacancyRate) || 0) / 100;
  const taxesMonthly = (Number(inputs.propertyTaxesAnnual) || 0) / 12;
  const insuranceMonthly = (Number(inputs.insuranceAnnual) || 0) / 12;
  const hoaMonthly = Number(inputs.hoaMonthly) || 0;
  const utilitiesMonthly = Number(inputs.utilitiesMonthly) || 0;
  const managementRate = (Number(inputs.managementRate) || 0) / 100;
  const maintenanceRate = inputs.maintenanceRate === undefined ? 0.08 : (Number(inputs.maintenanceRate) || 0) / 100;

  const loanAmount = Math.max(0, purchasePrice - downPayment);
  const mortgageMonthly = monthlyMortgagePayment(
    loanAmount,
    Number(inputs.interestRate) || 0,
    Number(inputs.loanTermYears) || 0
  );

  // Per-unit breakdown. The owner's unit contributes to potential income but
  // collects nothing while they live in it.
  const units = unitRents.map(function (rent, index) {
    const isOwnerOccupied = index === ownerUnitIndex;
    return {
      index,
      unitNumber: index + 1,
      isOwnerOccupied,
      marketRent: rent,
      collectedRent: isOwnerOccupied ? 0 : rent,
      effectiveRent: isOwnerOccupied ? 0 : rent * (1 - vacancyRate),
    };
  });

  const totalPotentialRent = unitRents.reduce(function (a, r) { return a + r; }, 0);
  const totalPotentialIncome = totalPotentialRent * (1 - vacancyRate);

  const actualRentRoll = units.reduce(function (a, u) { return a + u.collectedRent; }, 0);
  const actualIncome = actualRentRoll * (1 - vacancyRate);

  const ownerUnitMarketRent = unitRents[ownerUnitIndex] || 0;

  const fixedOpexMonthly = taxesMonthly + insuranceMonthly + hoaMonthly + utilitiesMonthly;
  const maintenanceMonthly = totalPotentialRent * maintenanceRate;

  // Actual (owner-occupied) scenario.
  const managementMonthly = actualRentRoll * managementRate;
  const operatingExpensesMonthly = fixedOpexMonthly + maintenanceMonthly + managementMonthly;
  const totalMonthlyExpenses = operatingExpensesMonthly + mortgageMonthly;
  const effectiveHousingCost = totalMonthlyExpenses - actualIncome;
  const monthlySavings = ownerUnitMarketRent - effectiveHousingCost;

  // Fully-rented scenario, used for cap rate and cash-on-cash so the property
  // can be compared against ordinary rentals.
  const managementIfFullyRented = totalPotentialRent * managementRate;
  const operatingExpensesIfFullyRented = fixedOpexMonthly + maintenanceMonthly + managementIfFullyRented;
  const noiMonthly = totalPotentialIncome - operatingExpensesIfFullyRented;
  const noiAnnual = noiMonthly * 12;
  const capRate = purchasePrice > 0 ? noiAnnual / purchasePrice : 0;

  const fullyRentedMonthlyCashFlow = noiMonthly - mortgageMonthly;
  const fullyRentedAnnualCashFlow = fullyRentedMonthlyCashFlow * 12;

  const totalCashInvested = downPayment + closingCosts;
  const cashOnCashReturn = totalCashInvested > 0 ? fullyRentedAnnualCashFlow / totalCashInvested : 0;

  return {
    purchasePrice,
    downPayment,
    closingCosts,
    loanAmount,
    totalCashInvested,
    mortgageMonthly,

    numberOfUnits,
    ownerUnitIndex,
    units,
    totalPotentialRent,
    totalPotentialIncome,
    actualRentRoll,
    actualIncome,
    ownerUnitMarketRent,

    taxesMonthly,
    insuranceMonthly,
    hoaMonthly,
    utilitiesMonthly,
    maintenanceMonthly,
    managementMonthly,
    operatingExpensesMonthly,
    totalMonthlyExpenses,

    effectiveHousingCost,
    monthlySavings,

    managementIfFullyRented,
    operatingExpensesIfFullyRented,
    noiAnnual,
    capRate,
    fullyRentedMonthlyCashFlow,
    fullyRentedAnnualCashFlow,
    cashOnCashReturn,
  };
}
