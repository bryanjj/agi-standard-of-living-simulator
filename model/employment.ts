import { calibration } from '../calibration/usBaseline';

const startingProbability = calibration.currentLaborForceEmploymentRate.value;
const midpointYears = calibration.employmentLogisticMidpointYears.value;
const logisticSteepness = Math.log(startingProbability / (1 - startingProbability)) / midpointYears;

export const employmentProbabilityAtYear = (year: number) => (
  1 / (1 + Math.exp(logisticSteepness * (Math.max(0, year) - midpointYears)))
);

export const employmentIndexAtYear = (year: number) => (
  employmentProbabilityAtYear(year) / startingProbability
);
