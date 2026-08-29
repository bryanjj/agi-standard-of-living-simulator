import { calibration } from '../calibration/usBaseline';
import type { HousingStatus } from './types';
import type { SimulatedHouseholdPath } from './comparison';

export type SpmProfile = {
  id: string;
  housing: HousingStatus;
  adults: number;
  children: number;
};

export type SpmWeeklyOutcome = {
  year: number;
  povertyRate: number;
  deepPovertyRate: number;
  medianCoverage: number;
  meanAnnualResources: number;
  meanThreshold: number;
};

const referenceScale = (2 + 0.5 * 2) ** 0.7;

export const spmEquivalenceScale = (adults: number, children: number) => {
  if (children === 0 && adults <= 2) return adults ** 0.5;
  if (adults === 1) return (1 + 0.8 + 0.5 * Math.max(0, children - 1)) ** 0.7;
  return (adults + 0.5 * children) ** 0.7;
};

export const spmReferenceThreshold = (housing: HousingStatus) => {
  if (housing === 'rent') return calibration.spmRenterThreshold2025.value;
  if (housing === 'own') return calibration.spmOwnerThreshold2025.value;
  return calibration.spmMortgageThreshold2025.value;
};

export const spmThreshold = (profile: SpmProfile) => (
  spmReferenceThreshold(profile.housing)
  * spmEquivalenceScale(profile.adults, profile.children)
  / referenceScale
);

export const spmPopulationOutcomes = (
  paths: SimulatedHouseholdPath[],
  profiles: SpmProfile[],
  weeksPerYear = 52,
): SpmWeeklyOutcome[] => {
  if (paths.length === 0) return [];
  const profileById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
  const baseThresholds = paths.map((path) => {
    const profile = profileById[path.profileId ?? ''];
    if (!profile) throw new Error(`Missing SPM profile for ${path.profileId ?? 'unknown worker'}`);
    return spmThreshold(profile);
  });
  const rollingTotals = paths.map((path) => path.resourceValues[0] * weeksPerYear);

  return paths[0].resourceValues.map((_, week) => {
    let below = 0;
    let deep = 0;
    let resourceTotal = 0;
    let thresholdTotal = 0;
    const coverage: number[] = [];

    paths.forEach((path, index) => {
      if (week > 0) {
        const outgoing = week >= weeksPerYear ? path.resourceValues[week - weeksPerYear] : path.resourceValues[0];
        rollingTotals[index] += path.resourceValues[week] - outgoing;
      }
      const annualResources = rollingTotals[index] / weeksPerYear;
      const basketPrice = path.purchasingPowerValues[week] === 0
        ? 1
        : path.incomeValues[week] / path.purchasingPowerValues[week];
      const threshold = baseThresholds[index] * basketPrice;
      const ratio = annualResources / threshold;
      if (ratio < 1) below += 1;
      if (ratio < 0.5) deep += 1;
      resourceTotal += annualResources;
      thresholdTotal += threshold;
      coverage.push(ratio);
    });
    coverage.sort((a, b) => a - b);
    const middle = Math.floor(coverage.length / 2);
    const medianCoverage = coverage.length % 2 === 0
      ? (coverage[middle - 1] + coverage[middle]) / 2
      : coverage[middle];

    return {
      year: week / weeksPerYear,
      povertyRate: 100 * below / paths.length,
      deepPovertyRate: 100 * deep / paths.length,
      medianCoverage,
      meanAnnualResources: resourceTotal / paths.length,
      meanThreshold: thresholdTotal / paths.length,
    };
  });
};
