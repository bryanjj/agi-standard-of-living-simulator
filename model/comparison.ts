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
  displaced: number;
  average: number;
};

export type SimulatedHouseholdPath = {
  id: string;
  displacementWeek: number;
  incomeValues: number[];
  purchasingPowerValues: number[];
};

export type SimulatedHouseholdCohort = SimulatedHouseholdPath & {
  workerCount: number;
};

export type WeeklyHouseholdOutcome = {
  year: number;
  employmentProbability: number;
  displacementProbability: number;
  employedIncome: number;
  displacedIncome: number;
  employedPurchasingPower: number;
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
  const employed = afterTaxIndex(employedGross, reference);
  const displaced = afterTaxIndex(displacedGross, reference);
  const employmentProbability = calibration.currentLaborForceEmploymentRate.value * (1 - year.automation);
  const displacementProbability = 1 - employmentProbability;

  return {
    employmentProbability,
    displacementProbability,
    employed,
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
      displacedIncome: interpolate(lowerIncome.displaced, upperIncome.displaced, fraction),
      employedPurchasingPower: interpolate(lowerPurchasingPower.employed, upperPurchasingPower.employed, fraction),
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

  return Array.from({ length: count }, (_, index) => {
    const initiallyEmployed = random() < calibration.currentLaborForceEmploymentRate.value;
    let displacementWeek = initiallyEmployed ? totalWeeks : 0;
    if (initiallyEmployed) {
      for (let week = 0; week < totalWeeks; week += 1) {
        const currentSurvival = 1 - week / totalWeeks;
        const nextSurvival = 1 - (week + 1) / totalWeeks;
        const weeklyRetentionProbability = currentSurvival === 0 ? 0 : nextSurvival / currentSurvival;
        if (random() > weeklyRetentionProbability) {
          displacementWeek = week + 1;
          break;
        }
      }
    }

    return {
      id: `worker${index}`,
      displacementWeek,
      incomeValues: timeline.map((outcome, week) => week < displacementWeek ? outcome.employedIncome : outcome.displacedIncome),
      purchasingPowerValues: timeline.map((outcome, week) => {
        if (week < displacementWeek) return outcome.employedPurchasingPower;
        if (displacementWeek === 0) return outcome.displacedPurchasingPower;
        const weeksSinceDisplacement = week - displacementWeek;
        const bufferRemaining = Math.max(0, 1 - weeksSinceDisplacement / calibration.consumptionSmoothingWeeks.value);
        const preDisplacementPurchasingPower = timeline[displacementWeek - 1].employedPurchasingPower;
        return outcome.displacedPurchasingPower + bufferRemaining * (preDisplacementPurchasingPower - outcome.displacedPurchasingPower);
      }),
    };
  });
};

export const aggregateHouseholdPaths = (
  paths: SimulatedHouseholdPath[],
  weeksPerCohort = 4,
): SimulatedHouseholdCohort[] => {
  if (weeksPerCohort < 1) throw new Error('weeksPerCohort must be at least 1');

  const groups = new Map<number, SimulatedHouseholdPath[]>();
  for (const path of paths) {
    const cohortKey = path.displacementWeek === 0
      ? -1
      : Math.floor((path.displacementWeek - 1) / weeksPerCohort);
    const group = groups.get(cohortKey) ?? [];
    group.push(path);
    groups.set(cohortKey, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([cohortKey, members]) => {
      const averageAt = (values: 'incomeValues' | 'purchasingPowerValues', week: number) => (
        members.reduce((sum, member) => sum + member[values][week], 0) / members.length
      );
      return {
        id: `cohort${cohortKey}`,
        displacementWeek: Math.round(members.reduce((sum, member) => sum + member.displacementWeek, 0) / members.length),
        workerCount: members.length,
        incomeValues: members[0].incomeValues.map((_, week) => averageAt('incomeValues', week)),
        purchasingPowerValues: members[0].purchasingPowerValues.map((_, week) => averageAt('purchasingPowerValues', week)),
      };
    });
};
