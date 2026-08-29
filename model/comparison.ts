import type { SimulationResult, SimulationYear } from './types';
import { effectiveTaxRate } from './simulation';
import { calibration } from '../calibration/usBaseline';

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
  employmentProbability: number;
  displacementProbability: number;
  employed: number;
  temporaryUnemployment: number;
  displaced: number;
  average: number;
};

export type SimulatedHouseholdPath = {
  id: string;
  employmentValues: boolean[];
  jobLossWeeks: number[];
  reemploymentWeeks: number[];
  incomeValues: number[];
  purchasingPowerValues: number[];
};

export type DisplayedHouseholdPath = SimulatedHouseholdPath & {
  workerCount: number;
};

export type WeeklyHouseholdOutcome = {
  year: number;
  employmentProbability: number;
  displacementProbability: number;
  employedIncome: number;
  temporaryUnemploymentIncome: number;
  displacedIncome: number;
  employedPurchasingPower: number;
  temporaryUnemploymentPurchasingPower: number;
  displacedPurchasingPower: number;
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
  const temporaryUnemploymentGross = displacedGross + baseline.laborIncome * year.wageIndex * calibration.unemploymentReplacement.value;
  const employed = afterTaxIndex(employedGross, reference);
  const temporaryUnemployment = afterTaxIndex(temporaryUnemploymentGross, reference);
  const displaced = afterTaxIndex(displacedGross, reference);
  const employmentProbability = calibration.currentLaborForceEmploymentRate.value * (1 - year.automation);
  const displacementProbability = 1 - employmentProbability;

  return {
    employmentProbability,
    displacementProbability,
    employed,
    temporaryUnemployment,
    displaced,
    average: afterTaxIncomeIndex(result, reference, yearIndex),
  };
};

export const purchasingPowerOutcomes = (result: SimulationResult, reference: SimulationResult, yearIndex: number): IncomeOutcomes => {
  const income = incomeOutcomes(result, reference, yearIndex);
  const basketPrice = result.years[yearIndex].prices.householdBasket;
  return {
    employmentProbability: income.employmentProbability,
    displacementProbability: income.displacementProbability,
    employed: income.employed / basketPrice,
    temporaryUnemployment: income.temporaryUnemployment / basketPrice,
    displaced: income.displaced / basketPrice,
    average: purchasingPowerIndex(result, reference, yearIndex),
  };
};

const interpolate = (start: number, end: number, fraction: number) => start + (end - start) * fraction;

export const weeklyHouseholdOutcomes = (
  result: SimulationResult,
  reference: SimulationResult,
  weeksPerYear = 52,
): WeeklyHouseholdOutcome[] => {
  const totalWeeks = result.scenario.horizonYears * weeksPerYear;
  return Array.from({ length: totalWeeks + 1 }, (_, week) => {
    const year = week / weeksPerYear;
    const lowerIndex = Math.min(Math.floor(year), result.years.length - 1);
    const upperIndex = Math.min(lowerIndex + 1, result.years.length - 1);
    const fraction = year - lowerIndex;
    const lowerIncome = incomeOutcomes(result, reference, lowerIndex);
    const upperIncome = incomeOutcomes(result, reference, upperIndex);
    const lowerPurchasingPower = purchasingPowerOutcomes(result, reference, lowerIndex);
    const upperPurchasingPower = purchasingPowerOutcomes(result, reference, upperIndex);
    const employmentProbability = calibration.currentLaborForceEmploymentRate.value * (1 - week / totalWeeks);

    return {
      year,
      employmentProbability,
      displacementProbability: 1 - employmentProbability,
      employedIncome: interpolate(lowerIncome.employed, upperIncome.employed, fraction),
      temporaryUnemploymentIncome: interpolate(lowerIncome.temporaryUnemployment, upperIncome.temporaryUnemployment, fraction),
      displacedIncome: interpolate(lowerIncome.displaced, upperIncome.displaced, fraction),
      employedPurchasingPower: interpolate(lowerPurchasingPower.employed, upperPurchasingPower.employed, fraction),
      temporaryUnemploymentPurchasingPower: interpolate(lowerPurchasingPower.temporaryUnemployment, upperPurchasingPower.temporaryUnemployment, fraction),
      displacedPurchasingPower: interpolate(lowerPurchasingPower.displaced, upperPurchasingPower.displaced, fraction),
    };
  });
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
  const timeline = weeklyHouseholdOutcomes(result, reference);
  const totalWeeks = timeline.length - 1;
  const startingEmploymentProbability = calibration.currentLaborForceEmploymentRate.value;
  const transitions = timeline.slice(0, -1).map((outcome, week) => {
    const nextEmploymentProbability = timeline[week + 1].employmentProbability;
    const reemploymentProbability = calibration.initialWeeklyReemploymentProbability.value
      * nextEmploymentProbability / startingEmploymentProbability;
    const jobLossProbability = outcome.employmentProbability === 0 ? 1 : Math.min(1, Math.max(0,
      (outcome.employmentProbability + outcome.displacementProbability * reemploymentProbability - nextEmploymentProbability)
        / outcome.employmentProbability,
    ));
    return { jobLossProbability, reemploymentProbability };
  });

  return Array.from({ length: count }, (_, index) => {
    let employed = random() < startingEmploymentProbability;
    let weeksUnemployed = calibration.unemploymentBenefitWeeks.value;
    let latestJobLossWeek = -1;
    let benefitIncomeIncrement = 0;
    let preLossPurchasingPower = timeline[0].employedPurchasingPower;
    const employmentValues: boolean[] = [];
    const jobLossWeeks: number[] = [];
    const reemploymentWeeks: number[] = [];
    const incomeValues: number[] = [];
    const purchasingPowerValues: number[] = [];

    for (let week = 0; week <= totalWeeks; week += 1) {
      const outcome = timeline[week];
      employmentValues.push(employed);
      if (employed) {
        incomeValues.push(outcome.employedIncome);
        purchasingPowerValues.push(outcome.employedPurchasingPower);
      } else {
        const receivesUnemploymentInsurance = latestJobLossWeek >= 0
          && weeksUnemployed < calibration.unemploymentBenefitWeeks.value;
        incomeValues.push(outcome.displacedIncome + (receivesUnemploymentInsurance ? benefitIncomeIncrement : 0));
        if (latestJobLossWeek < 0) {
          purchasingPowerValues.push(outcome.displacedPurchasingPower);
        } else {
          const bufferRemaining = Math.max(0, 1 - weeksUnemployed / calibration.consumptionSmoothingWeeks.value);
          purchasingPowerValues.push(outcome.displacedPurchasingPower
            + bufferRemaining * (preLossPurchasingPower - outcome.displacedPurchasingPower));
        }
      }

      if (week === totalWeeks) continue;
      const transition = transitions[week];
      if (employed) {
        if (random() < transition.jobLossProbability) {
          employed = false;
          weeksUnemployed = 0;
          latestJobLossWeek = week + 1;
          preLossPurchasingPower = outcome.employedPurchasingPower;
          benefitIncomeIncrement = outcome.temporaryUnemploymentIncome - outcome.displacedIncome;
          jobLossWeeks.push(week + 1);
        }
      } else if (random() < transition.reemploymentProbability) {
        employed = true;
        weeksUnemployed = 0;
        reemploymentWeeks.push(week + 1);
      } else {
        weeksUnemployed += 1;
      }
    }

    return {
      id: `worker${index}`,
      employmentValues,
      jobLossWeeks,
      reemploymentWeeks,
      incomeValues,
      purchasingPowerValues,
    };
  });
};

export const sampleHouseholdPaths = (
  paths: SimulatedHouseholdPath[],
  maxDisplayedPaths = 250,
): DisplayedHouseholdPath[] => {
  if (maxDisplayedPaths < 1) throw new Error('maxDisplayedPaths must be at least 1');
  if (paths.length <= maxDisplayedPaths) return paths.map((path) => ({ ...path, workerCount: 1 }));

  return Array.from({ length: maxDisplayedPaths }, (_, index) => {
    const start = Math.floor(index * paths.length / maxDisplayedPaths);
    const end = Math.floor((index + 1) * paths.length / maxDisplayedPaths);
    const representative = paths[Math.floor((start + end - 1) / 2)];
    return { ...representative, id: `sample${index}`, workerCount: end - start };
  });
};
