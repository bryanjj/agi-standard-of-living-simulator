import type { SimulationResult, SimulationYear } from './types';
import { effectiveTaxRate } from './simulation';

export const afterTaxResources = (year: SimulationYear) => year.laborIncome + year.capitalIncome + year.transfers - year.taxes;

export const purchasingPowerIndex = (result: SimulationResult, reference: SimulationResult, yearIndex: number) => (
  result.years[yearIndex].standardOfLiving * afterTaxResources(result.years[0]) / afterTaxResources(reference.years[0])
);

export const afterTaxIncomeIndex = (result: SimulationResult, reference: SimulationResult, yearIndex: number) => (
  100 * afterTaxResources(result.years[yearIndex]) / afterTaxResources(reference.years[0])
);

export const purchasingPowerScale = (result: SimulationResult, reference: SimulationResult) => (
  afterTaxResources(result.years[0]) / afterTaxResources(reference.years[0])
);

export type IncomeOutcomes = {
  displacementProbability: number;
  employed: number;
  displaced: number;
  average: number;
  median: number;
};

export type SimulatedHouseholdPath = {
  id: string;
  displacementYear: number;
  incomeValues: number[];
  purchasingPowerValues: number[];
};

const afterTaxIndex = (grossResources: number, reference: SimulationResult) => (
  100 * (grossResources * (1 - effectiveTaxRate(grossResources))) / afterTaxResources(reference.years[0])
);

export const incomeOutcomes = (result: SimulationResult, reference: SimulationResult, yearIndex: number): IncomeOutcomes => {
  const baseline = result.years[0];
  const year = result.years[yearIndex];
  const replacement = result.intervention.laborLossReplacement;
  const expectedReplacement = replacement * Math.max(0, baseline.laborIncome - year.laborIncome);
  const equalDividend = Math.max(0, year.transfers - baseline.transfers - expectedReplacement);

  const employedGross = baseline.laborIncome * year.wageIndex + year.capitalIncome + baseline.transfers + equalDividend;
  const displacedGross = year.capitalIncome + baseline.transfers + baseline.laborIncome * replacement + equalDividend;
  const employed = afterTaxIndex(employedGross, reference);
  const displaced = afterTaxIndex(displacedGross, reference);
  const displacementProbability = year.automation;

  return {
    displacementProbability,
    employed,
    displaced,
    average: afterTaxIncomeIndex(result, reference, yearIndex),
    median: displacementProbability >= 0.5 ? displaced : employed,
  };
};

export const purchasingPowerOutcomes = (result: SimulationResult, reference: SimulationResult, yearIndex: number): IncomeOutcomes => {
  const income = incomeOutcomes(result, reference, yearIndex);
  const basketPrice = result.years[yearIndex].prices.householdBasket;
  return {
    displacementProbability: income.displacementProbability,
    employed: income.employed / basketPrice,
    displaced: income.displaced / basketPrice,
    average: purchasingPowerIndex(result, reference, yearIndex),
    median: income.median / basketPrice,
  };
};

const seededRandom = (initialSeed: number) => {
  let seed = initialSeed;
  return () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const simulateHouseholdPaths = (
  result: SimulationResult,
  reference: SimulationResult,
  count = 100,
  seed = 2026,
): SimulatedHouseholdPath[] => {
  const random = seededRandom(seed);
  const income = result.years.map((_, index) => incomeOutcomes(result, reference, index));
  const purchasingPower = result.years.map((_, index) => purchasingPowerOutcomes(result, reference, index));

  return Array.from({ length: count }, (_, index) => {
    const draw = random();
    const displacementIndex = income.findIndex((outcome) => outcome.displacementProbability >= draw);
    const displacementYear = displacementIndex < 0 ? result.years.length : result.years[displacementIndex].year;

    return {
      id: `worker${index}`,
      displacementYear,
      incomeValues: income.map((outcome, yearIndex) => (
        result.years[yearIndex].year < displacementYear ? outcome.employed : outcome.displaced
      )),
      purchasingPowerValues: purchasingPower.map((outcome, yearIndex) => (
        result.years[yearIndex].year < displacementYear ? outcome.employed : outcome.displaced
      )),
    };
  });
};
