import type { Household, HousingStatus, Sourced } from '../model/types';

export type QuintileId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

type QuintileCalibration = {
  income: Sourced<number>;
  equityHoldings: Sourced<number>;
  householdSize: Sourced<number>;
  housing: Sourced<HousingStatus>;
};

export type QuintilePreset = {
  id: QuintileId;
  label: string;
  shortLabel: string;
  color: string;
  household: Household;
  calibration: QuintileCalibration;
};

const income = (value: number): Sourced<number> => ({ value, provenance: 'DATA', source: 'U.S. Census Bureau Historical Income Table H-3', year: 2024, note: 'Mean current-dollar household income for this fifth.' });
const equityHoldings = (value: number): Sourced<number> => ({ value, provenance: 'CALCULATED', source: 'Federal Reserve 2022 Survey of Consumer Finances public summary extract (EQUITY)', year: 2022, note: 'Survey-weighted median direct and indirect stock equity for this income group, in 2022 dollars. Cash, deposits, bonds, housing, and other assets are excluded.' });
const householdSize = (value: number): Sourced<number> => ({ value, provenance: 'CALCULATED', source: 'Federal Reserve 2022 Survey of Consumer Finances public summary extract', year: 2022, note: 'Rounded weighted proxy: children plus one adult, or two adults when married.' });
const housing = (value: HousingStatus): Sourced<HousingStatus> => ({ value, provenance: 'CALCULATED', source: 'Federal Reserve 2022 Survey of Consumer Finances public summary extract', year: 2022, note: 'Most common modeled tenure in this income group; home debt distinguishes mortgage from outright ownership.' });

const definitions: Array<Omit<QuintilePreset, 'household'> & { calibration: QuintileCalibration }> = [
  { id: 'q1', label: 'Lowest 20%', shortLabel: 'Q1', color: '#367a9c', calibration: { income: income(18_460), equityHoldings: equityHoldings(0), householdSize: householdSize(2), housing: housing('rent') } },
  { id: 'q2', label: 'Second 20%', shortLabel: 'Q2', color: '#4f9671', calibration: { income: income(49_380), equityHoldings: equityHoldings(0), householdSize: householdSize(2), housing: housing('rent') } },
  { id: 'q3', label: 'Middle 20%', shortLabel: 'Q3', color: '#c09532', calibration: { income: income(84_390), equityHoldings: equityHoldings(3_300), householdSize: householdSize(2), housing: housing('mortgage') } },
  { id: 'q4', label: 'Fourth 20%', shortLabel: 'Q4', color: '#cf653b', calibration: { income: income(136_800), equityHoldings: equityHoldings(22_750), householdSize: householdSize(3), housing: housing('mortgage') } },
  { id: 'q5', label: 'Highest 20%', shortLabel: 'Q5', color: '#735da6', calibration: { income: income(316_100), equityHoldings: equityHoldings(257_050), householdSize: householdSize(3), housing: housing('mortgage') } },
];

export const quintilePresets: QuintilePreset[] = definitions.map((preset) => ({
  ...preset,
  household: {
    annualIncome: preset.calibration.income.value,
    equityHoldings: preset.calibration.equityHoldings.value,
    householdSize: preset.calibration.householdSize.value,
    housing: preset.calibration.housing.value,
  },
}));

export const quintileById = Object.fromEntries(quintilePresets.map((preset) => [preset.id, preset])) as Record<QuintileId, QuintilePreset>;
