import { calibration, housingCalibration } from '../calibration/usBaseline';
import type { Household, SimulationResult, SimulationYear, Scenario } from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const effectiveTaxRate = (income: number) => {
  if (income <= calibration.taxThresholdLow.value) return calibration.taxRateLow.value;
  if (income <= calibration.taxThresholdHigh.value) return calibration.taxRateMiddle.value;
  return calibration.taxRateHigh.value;
};

export function simulate(scenario: Scenario, household: Household): SimulationResult {
  const safeHousehold: Household = {
    annualIncome: Math.max(1, household.annualIncome),
    householdSize: clamp(Math.round(household.householdSize), 1, 12),
    investments: Math.max(0, household.investments),
    housing: household.housing,
  };
  const baseCapital = Math.min(safeHousehold.annualIncome * calibration.capitalIncomeCap.value, safeHousehold.investments * calibration.realInvestmentYield.value);
  const baseTransferShare = Math.min(calibration.transferShareCap.value, calibration.baseTransferFloor.value + safeHousehold.householdSize * calibration.transferPerPerson.value);
  const baseTransfers = safeHousehold.annualIncome * baseTransferShare;
  const baseLabor = Math.max(0, safeHousehold.annualIncome - baseCapital - baseTransfers);
  const baseTaxes = safeHousehold.annualIncome * effectiveTaxRate(safeHousehold.annualIncome);
  const baseAfterTax = safeHousehold.annualIncome - baseTaxes;
  const housing = housingCalibration[safeHousehold.housing];
  const years: SimulationYear[] = [];

  for (let year = 0; year <= scenario.horizonYears; year += 1) {
    const automation = clamp(year * calibration.automationPerYear.value, 0, 1);
    const employment = 1 - automation;
    const output = 1 + (calibration.yearTwentyOutputMultiple.value - 1) * automation ** 2;
    const laborShare = calibration.baselineLaborShare.value * (1 - automation) ** calibration.laborShareCurveExponent.value;
    const nationalLaborIncomeIndex = (output * laborShare) / calibration.baselineLaborShare.value;
    const nationalCapitalIncomeIndex = (output * (1 - laborShare)) / (1 - calibration.baselineLaborShare.value);
    const wageIndex = employment === 0 ? 0 : nationalLaborIncomeIndex / employment;
    const laborIncome = baseLabor * nationalLaborIncomeIndex;
    const capitalIncome = baseCapital * nationalCapitalIncomeIndex;
    const transfers = baseTransfers + Math.max(0, baseLabor - laborIncome) * calibration.unemploymentReplacement.value;
    const grossResources = laborIncome + capitalIncome + transfers;
    const taxes = grossResources * effectiveTaxRate(grossResources);
    const afterTax = grossResources - taxes;
    const reproduciblePrice = output ** -calibration.reproduciblePassThrough.value;
    const rawScarcePrice = 1 + calibration.scarcePricePressure.value * (output ** (1 / 3) - 1);
    const scarcePrice = 1 + (rawScarcePrice - 1) * (1 - housing.ownershipShield.value);
    const householdBasket = (1 - housing.scarceBudgetShare.value) * reproduciblePrice + housing.scarceBudgetShare.value * scarcePrice;
    const standardOfLiving = 100 * (afterTax / baseAfterTax) / householdBasket;
    const decomposition = {
      labor: (100 * (laborIncome - baseLabor)) / baseAfterTax / householdBasket,
      capital: (100 * (capitalIncome - baseCapital)) / baseAfterTax / householdBasket,
      transfers: (100 * (transfers - baseTransfers)) / baseAfterTax / householdBasket,
      taxes: (-100 * (taxes - baseTaxes)) / baseAfterTax / householdBasket,
      productivity: (100 * (1 - housing.scarceBudgetShare.value) * (1 - reproduciblePrice)) / householdBasket,
      scarcity: (100 * housing.scarceBudgetShare.value * (1 - scarcePrice)) / householdBasket,
    };
    const resourceTotal = Math.max(1, grossResources);
    years.push({ year, standardOfLiving, noAgiBaseline: 100 * (1 + calibration.baselineRealGrowth.value) ** year,
      automation, employment, output, laborShare, wageIndex, laborIncome, capitalIncome, transfers, taxes,
      resourceShares: { labor: laborIncome / resourceTotal, capital: capitalIncome / resourceTotal, transfers: transfers / resourceTotal },
      prices: { reproducible: reproduciblePrice, scarce: scarcePrice, householdBasket }, decomposition,
    });
  }
  return { scenario, household: safeHousehold, years };
}
