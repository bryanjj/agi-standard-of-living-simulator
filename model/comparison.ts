import type { SimulationResult, SimulationYear } from './types';

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
