import type { Household, HousingStatus, Sourced } from '../model/types';

export type QuintileId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

type QuintileCalibration = {
  income: Sourced<number>;
  investments: Sourced<number>;
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
const investments = (value: number): Sourced<number> => ({ value, provenance: 'DATA', source: 'Federal Reserve 2022 Survey of Consumer Finances public summary extract', year: 2022, note: 'Weighted mean financial assets for this income group, in 2022 dollars.' });
const householdSize = (value: number): Sourced<number> => ({ value, provenance: 'CALCULATED', source: 'Federal Reserve 2022 Survey of Consumer Finances public summary extract', year: 2022, note: 'Rounded weighted proxy: children plus one adult, or two adults when married.' });
const housing = (value: HousingStatus): Sourced<HousingStatus> => ({ value, provenance: 'CALCULATED', source: 'Federal Reserve 2022 Survey of Consumer Finances public summary extract', year: 2022, note: 'Most common modeled tenure in this income group; home debt distinguishes mortgage from outright ownership.' });

const definitions: Array<Omit<QuintilePreset, 'household'> & { calibration: QuintileCalibration }> = [
  { id: 'q1', label: 'Lowest 20%', shortLabel: 'Q1', color: '#367a9c', calibration: { income: income(18_460), investments: investments(49_965), householdSize: householdSize(2), housing: housing('rent') } },
  { id: 'q2', label: 'Second 20%', shortLabel: 'Q2', color: '#4f9671', calibration: { income: income(49_380), investments: investments(63_277), householdSize: householdSize(2), housing: housing('rent') } },
  { id: 'q3', label: 'Middle 20%', shortLabel: 'Q3', color: '#c09532', calibration: { income: income(84_390), investments: investments(144_344), householdSize: householdSize(2), housing: housing('mortgage') } },
  { id: 'q4', label: 'Fourth 20%', shortLabel: 'Q4', color: '#cf653b', calibration: { income: income(136_800), investments: investments(262_069), householdSize: householdSize(3), housing: housing('mortgage') } },
  { id: 'q5', label: 'Highest 20%', shortLabel: 'Q5', color: '#735da6', calibration: { income: income(316_100), investments: investments(1_995_509), householdSize: householdSize(3), housing: housing('mortgage') } },
];

export const quintilePresets: QuintilePreset[] = definitions.map((preset) => ({
  ...preset,
  household: {
    annualIncome: preset.calibration.income.value,
    investments: preset.calibration.investments.value,
    householdSize: preset.calibration.householdSize.value,
    housing: preset.calibration.housing.value,
  },
}));

export const quintileById = Object.fromEntries(quintilePresets.map((preset) => [preset.id, preset])) as Record<QuintileId, QuintilePreset>;
