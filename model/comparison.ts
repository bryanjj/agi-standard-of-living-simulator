import type { SimulationResult, SimulationYear } from './types';
import { effectiveTaxRate } from './simulation';
import { calibration } from '../calibration/usBaseline';
import { employmentProbabilityAtYear } from './employment';

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
  profileId?: string;
  employmentValues: boolean[];
  jobLossWeeks: number[];
  reemploymentWeeks: number[];
  incomeValues: number[];
  resourceValues: number[];
  purchasingPowerValues: number[];
};

export type DisplayedHouseholdPath = SimulatedHouseholdPath & {
  workerCount: number;
};

export type MeanHouseholdPath = {
  incomeValues: number[];
  purchasingPowerValues: number[];
};

export type PopulationProfile = {
  id: string;
  result: SimulationResult;
  weight: number;
};

export type PopulationSimulation = {
  paths: SimulatedHouseholdPath[];
  profileCounts: Record<string, number>;
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
    const employmentProbability = employmentProbabilityAtYear(year);

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
        const income = outcome.displacedIncome + (receivesUnemploymentInsurance ? benefitIncomeIncrement : 0);
        incomeValues.push(income);
        purchasingPowerValues.push(income * outcome.displacedPurchasingPower / outcome.displacedIncome);
      }

      if (week === totalWeeks) continue;
      const transition = transitions[week];
      if (employed) {
        if (random() < transition.jobLossProbability) {
          employed = false;
          weeksUnemployed = 0;
          latestJobLossWeek = week + 1;
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
      resourceValues: incomeValues.map((value) => value * afterTaxResources(reference.years[0]) / 100),
      purchasingPowerValues,
    };
  });
};

export const simulatePopulationPaths = (
  profiles: PopulationProfile[],
  count = 1_000,
  seed = 2026,
): PopulationSimulation => {
  if (profiles.length === 0) throw new Error('At least one population profile is required');
  const totalWeight = profiles.reduce((sum, profile) => sum + profile.weight, 0);
  if (totalWeight <= 0) throw new Error('Population profile weights must sum to more than zero');

  const random = seededRandom(seed ^ 0x51F15EED);
  const assignments = Array.from({ length: count }, () => {
    const draw = random() * totalWeight;
    let cumulative = 0;
    const match = profiles.findIndex((profile) => {
      cumulative += profile.weight;
      return draw < cumulative;
    });
    return match < 0 ? profiles.length - 1 : match;
  });
  const profileCounts = Object.fromEntries(profiles.map((profile, index) => [
    profile.id,
    assignments.filter((assignment) => assignment === index).length,
  ]));
  const reference = profiles[Math.floor(profiles.length / 2)].result;
  const rawPaths = profiles.flatMap((profile, index) => (
    simulateHouseholdPaths(profile.result, reference, profileCounts[profile.id], seed + (index + 1) * 10_007)
      .map((path) => ({ ...path, profileId: profile.id }))
  ));
  const initialMean = rawPaths.reduce((sum, path) => sum + path.incomeValues[0], 0) / rawPaths.length;
  const normalization = 100 / initialMean;
  const paths = rawPaths.map((path, index) => ({
    ...path,
    id: `worker${index}`,
    incomeValues: path.incomeValues.map((value) => value * normalization),
    resourceValues: path.resourceValues,
    purchasingPowerValues: path.purchasingPowerValues.map((value) => value * normalization),
  }));

  return { paths, profileCounts };
};

export const aggregateSimulationResults = (
  profiles: Array<{ result: SimulationResult; count: number }>,
): SimulationResult => {
  const totalCount = profiles.reduce((sum, profile) => sum + profile.count, 0);
  if (totalCount <= 0) throw new Error('At least one sampled household is required');
  const average = (getValue: (result: SimulationResult) => number) => (
    profiles.reduce((sum, profile) => sum + profile.count * getValue(profile.result), 0) / totalCount
  );
  const baselineAfterTax = average((result) => afterTaxResources(result.years[0]));
  const years = profiles[0].result.years.map((_, yearIndex) => {
    const yearAverage = (getValue: (year: SimulationYear) => number) => average((result) => getValue(result.years[yearIndex]));
    const laborIncome = yearAverage((year) => year.laborIncome);
    const capitalIncome = yearAverage((year) => year.capitalIncome);
    const transfers = yearAverage((year) => year.transfers);
    const taxes = yearAverage((year) => year.taxes);
    const resourceTotal = Math.max(1, laborIncome + capitalIncome + transfers);
    const decomposition = Object.fromEntries(
      (['labor', 'capital', 'transfers', 'taxes', 'productivity', 'scarcity'] as const).map((key) => [
        key,
        average((result) => result.years[yearIndex].decomposition[key] * afterTaxResources(result.years[0])) / baselineAfterTax,
      ]),
    ) as SimulationYear['decomposition'];

    return {
      year: yearIndex,
      standardOfLiving: 100 + Object.values(decomposition).reduce((sum, value) => sum + value, 0),
      noAgiBaseline: yearAverage((year) => year.noAgiBaseline),
      automation: yearAverage((year) => year.automation),
      employment: yearAverage((year) => year.employment),
      output: yearAverage((year) => year.output),
      laborShare: yearAverage((year) => year.laborShare),
      wageIndex: yearAverage((year) => year.wageIndex),
      laborIncome,
      capitalIncome,
      transfers,
      taxes,
      resourceShares: {
        labor: laborIncome / resourceTotal,
        capital: capitalIncome / resourceTotal,
        transfers: transfers / resourceTotal,
      },
      prices: {
        reproducible: yearAverage((year) => year.prices.reproducible),
        scarce: yearAverage((year) => year.prices.scarce),
        householdBasket: yearAverage((year) => year.prices.householdBasket),
      },
      decomposition,
    };
  });

  return {
    scenario: profiles[0].result.scenario,
    intervention: profiles[0].result.intervention,
    household: {
      annualIncome: average((result) => result.household.annualIncome),
      householdSize: average((result) => result.household.householdSize),
      equityHoldings: average((result) => result.household.equityHoldings),
      housing: 'mortgage',
    },
    years,
  };
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

export const meanHouseholdPath = (paths: SimulatedHouseholdPath[]): MeanHouseholdPath => {
  if (paths.length === 0) return { incomeValues: [], purchasingPowerValues: [] };

  return {
    incomeValues: paths[0].incomeValues.map((_, week) => (
      paths.reduce((sum, path) => sum + path.incomeValues[week], 0) / paths.length
    )),
    purchasingPowerValues: paths[0].purchasingPowerValues.map((_, week) => (
      paths.reduce((sum, path) => sum + path.purchasingPowerValues[week], 0) / paths.length
    )),
  };
};
