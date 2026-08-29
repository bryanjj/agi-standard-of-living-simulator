import type { HousingStatus, SourcedValue } from '../model/types';

export const calibration = {
  currentLaborForceEmploymentRate: {
    value: 0.959, provenance: 'DATA', source: 'U.S. Bureau of Labor Statistics, Current Population Survey, July 2026', year: 2026,
    note: 'One minus the 4.1% seasonally adjusted unemployment rate; used as the initial chance that a modeled worker has a job.',
  },
  baselineLaborShare: {
    value: 0.59, provenance: 'ASSUMPTION', source: 'Milestone-one model calibration',
    note: 'Rounded U.S. labor share used only as the starting factor-income split.',
  },
  topTenEquityShare: {
    value: 48.15 / 55.14, provenance: 'DATA', source: 'Federal Reserve Distributional Financial Accounts, 2026 Q1', year: 2026,
    note: 'Top 10% corporate equities and mutual fund shares divided by the household total.',
  },
  realEquityIncomeYield: {
    value: 0.04, provenance: 'ASSUMPTION', source: 'Milestone-one model calibration',
    note: 'Annual real income claim per dollar of stock and stock-fund equity.',
  },
  unemploymentReplacement: {
    value: 0.1, provenance: 'ASSUMPTION', source: 'Simplified current-law fiscal proxy',
    note: 'Ten percent of lost labor income is replaced; not a microsimulation of eligibility.',
  },
  expandedSafetyNetReplacement: {
    value: 0.35, provenance: 'ASSUMPTION', source: 'Illustrative intervention calibration',
    note: 'Expanded safety net replaces 35% of modeled lost labor income.',
  },
  citizenDividendShare: {
    value: 0.1, provenance: 'ASSUMPTION', source: 'Illustrative intervention calibration',
    note: 'Citizen dividend distributes 10% of new national AI capital income equally.',
  },
  publicFundDividendShare: {
    value: 0.3, provenance: 'ASSUMPTION', source: 'Illustrative intervention calibration',
    note: 'Public AI fund distributes 30% of new national AI capital income equally.',
  },
  nationalMeanHouseholdIncome: {
    value: 121_026, provenance: 'DATA', source: 'U.S. Census Bureau Historical Income Table H-3', year: 2024,
    note: 'Mean of the five equally sized household-income quintile means.',
  },
  reproduciblePassThrough: {
    value: 0.5, provenance: 'ASSUMPTION', source: 'Two-good milestone model',
    note: 'Half of reproducible-output growth passes through to the household price index.',
  },
  scarcePricePressure: {
    value: 0.6, provenance: 'ASSUMPTION', source: 'Two-good milestone model',
    note: 'Maps aggregate abundance into higher relative prices for fixed-supply goods.',
  },
  baselineRealGrowth: {
    value: 0.01, provenance: 'ASSUMPTION', source: 'No-AGI comparison path',
    note: 'One percent annual growth in household real purchasing power.',
  },
  automationPerYear: {
    value: 0.05, provenance: 'ASSUMPTION', source: 'Named 20-year transformative scenario',
    note: 'Five percentage points of the original workforce become automatable each year.',
  },
  yearTwentyOutputMultiple: {
    value: 10, provenance: 'ASSUMPTION', source: 'Calibration to Korinek and Suh transformative scenario', year: 2024,
    note: 'Rounded milestone target; their published illustration rises to more than ten times baseline output.',
  },
  laborShareCurveExponent: {
    value: 1.4, provenance: 'ASSUMPTION', source: 'Milestone-one reduced-form curve',
    note: 'Produces the paper-consistent pattern of initially supported wages followed by labor-share collapse.',
  },
  capitalIncomeCap: {
    value: 0.35, provenance: 'ASSUMPTION', source: 'Household income-composition inference',
    note: 'Caps inferred current investment income at 35% of reported household income.',
  },
  baseTransferFloor: {
    value: 0.02, provenance: 'ASSUMPTION', source: 'Simplified current-law fiscal proxy',
    note: 'Base transfer-income share before household-size adjustment.',
  },
  transferPerPerson: {
    value: 0.01, provenance: 'ASSUMPTION', source: 'Simplified current-law fiscal proxy',
    note: 'Adds one percentage point of baseline transfer share per household member.',
  },
  transferShareCap: {
    value: 0.1, provenance: 'ASSUMPTION', source: 'Simplified current-law fiscal proxy',
    note: 'Caps inferred baseline transfer income at 10% of reported household income.',
  },
  taxRateLow: {
    value: 0.12, provenance: 'ASSUMPTION', source: 'Simplified current-law fiscal proxy',
    note: 'Illustrative effective rate below the first modeled income threshold.',
  },
  taxRateMiddle: {
    value: 0.18, provenance: 'ASSUMPTION', source: 'Simplified current-law fiscal proxy',
    note: 'Illustrative effective rate in the middle modeled income band.',
  },
  taxRateHigh: {
    value: 0.24, provenance: 'ASSUMPTION', source: 'Simplified current-law fiscal proxy',
    note: 'Illustrative effective rate above the second modeled income threshold.',
  },
  taxThresholdLow: {
    value: 75_000, provenance: 'ASSUMPTION', source: 'Simplified current-law fiscal proxy',
    note: 'First gross household-income threshold.',
  },
  taxThresholdHigh: {
    value: 200_000, provenance: 'ASSUMPTION', source: 'Simplified current-law fiscal proxy',
    note: 'Second gross household-income threshold.',
  },
} satisfies Record<string, SourcedValue>;

export const housingCalibration: Record<HousingStatus, { scarceBudgetShare: SourcedValue; ownershipShield: SourcedValue }> = {
  rent: {
    scarceBudgetShare: { value: 0.32, provenance: 'ASSUMPTION', source: 'Two-good milestone model', note: 'Renter budget share exposed to irreproducible scarce factors, represented by housing.' },
    ownershipShield: { value: 0, provenance: 'ASSUMPTION', source: 'Two-good milestone model', note: 'Renters receive no housing-asset hedge.' },
  },
  mortgage: {
    scarceBudgetShare: { value: 0.3, provenance: 'ASSUMPTION', source: 'Two-good milestone model', note: 'Mortgaged-owner budget share exposed to irreproducible scarce factors, represented by housing.' },
    ownershipShield: { value: 0.45, provenance: 'ASSUMPTION', source: 'Two-good milestone model', note: 'Partial hedge from owning the home.' },
  },
  own: {
    scarceBudgetShare: { value: 0.18, provenance: 'ASSUMPTION', source: 'Two-good milestone model', note: 'Lower cash exposure for an outright owner.' },
    ownershipShield: { value: 0.8, provenance: 'ASSUMPTION', source: 'Two-good milestone model', note: 'Housing ownership hedges most exposure to the modeled fixed factor.' },
  },
};
